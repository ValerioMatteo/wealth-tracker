// supabase/functions/update-prices/index.ts
// Batch price update for portfolio assets (replaces refresh-prices)
// Supports two modes:
//   - Per-portfolio: { portfolio_id } - updates a single portfolio (called from UI)
//   - Cron: { mode: 'cron' } - updates ALL assets with symbols (called by scheduler)
// Deploy with: supabase functions deploy update-prices

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/auth.ts'
import {
  fetchStockPrice,
  fetchBondByISIN,
  fetchCryptoPrice,
  fetchMetalPrice,
  METAL_SYMBOL_MAP,
} from '../_shared/priceFetchers.ts'

interface Asset {
  id: string
  asset_type: string
  symbol: string | null
  current_price: number
  metadata: Record<string, unknown>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const body = await req.json()
    const { portfolio_id, mode } = body

    const supabaseAdmin = createAdminClient()

    // --- Cron mode: update all assets ---
    if (mode === 'cron') {
      // In cron mode, skip auth (called by scheduler with service role)
      const { data: assets, error } = await supabaseAdmin
        .from('assets')
        .select('id, asset_type, symbol, current_price, metadata')
        .not('symbol', 'is', null)
        .in('asset_type', ['stock', 'etf', 'bond', 'crypto', 'commodity'])

      if (error) throw error

      const results = await updateAssetPrices(supabaseAdmin, assets as Asset[])

      return jsonResponse({
        success: true,
        mode: 'cron',
        ...results,
      })
    }

    // --- Per-portfolio mode ---
    if (!portfolio_id) {
      return errorResponse('portfolio_id is required (or use mode: "cron")')
    }

    // Verify auth: user must own the portfolio
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Non autenticato', 401)

    // Check ownership via user-scoped query
    const { data: portfolioCheck } = await supabaseAdmin
      .from('portfolios')
      .select('id')
      .eq('id', portfolio_id)
      .eq('user_id', user.id)
      .single()

    if (!portfolioCheck) {
      return errorResponse('Portfolio non trovato o non autorizzato', 403)
    }

    // Get assets needing price updates
    const { data: assets, error: assetsError } = await supabaseAdmin
      .from('assets')
      .select('id, asset_type, symbol, current_price, metadata')
      .eq('portfolio_id', portfolio_id)
      .not('symbol', 'is', null)

    if (assetsError) throw assetsError

    const results = await updateAssetPrices(supabaseAdmin, assets as Asset[], portfolio_id)

    return jsonResponse({
      success: true,
      mode: 'portfolio',
      portfolio_id,
      ...results,
    })
  } catch (error) {
    console.error('update-prices error:', error)
    return errorResponse(error.message || 'Errore aggiornamento prezzi', 500)
  }
})

async function updateAssetPrices(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  assets: Asset[],
  portfolioId?: string,
) {
  const updates: Array<{ id: string; symbol: string; price: number }> = []
  const errors: Array<{ symbol: string; error: string }> = []

  for (const asset of assets) {
    if (!asset.symbol) continue

    try {
      let newPrice: number | null = null

      switch (asset.asset_type) {
        case 'stock':
        case 'etf': {
          const result = await fetchStockPrice(asset.symbol)
          newPrice = result.price
          break
        }

        case 'bond': {
          try {
            const result = await fetchStockPrice(asset.symbol)
            newPrice = result.price
          } catch {
            const isin = asset.metadata?.isin as string | undefined
            if (isin) {
              const result = await fetchBondByISIN(isin)
              newPrice = result?.price ?? null
            }
          }
          break
        }

        case 'crypto': {
          const result = await fetchCryptoPrice(asset.symbol)
          newPrice = result.price
          break
        }

        case 'commodity': {
          // Check if the symbol is a known metal alias
          const upperSymbol = asset.symbol.toUpperCase()
          if (METAL_SYMBOL_MAP[upperSymbol]) {
            const result = await fetchMetalPrice(asset.symbol)
            newPrice = result.price
          } else {
            // Try as direct Yahoo symbol
            const result = await fetchStockPrice(asset.symbol)
            newPrice = result.price
          }
          break
        }

        default:
          continue
      }

      if (newPrice !== null && newPrice !== asset.current_price) {
        updates.push({ id: asset.id, symbol: asset.symbol, price: newPrice })

        // Update the asset price
        await supabaseAdmin
          .from('assets')
          .update({
            current_price: newPrice,
            last_updated: new Date().toISOString(),
          })
          .eq('id', asset.id)

        // Store in price history
        await supabaseAdmin.from('price_history').insert({
          symbol: asset.symbol,
          asset_type: asset.asset_type,
          price: newPrice,
          source: 'update-prices',
          metadata: portfolioId ? { portfolio_id: portfolioId } : {},
        })
      }
    } catch (error) {
      console.error(`Error fetching price for ${asset.symbol}:`, error)
      errors.push({ symbol: asset.symbol, error: error.message })
    }
  }

  return {
    updated: updates.length,
    total: assets.length,
    details: updates.map(u => ({ symbol: u.symbol, price: u.price })),
    errors: errors.length > 0 ? errors : undefined,
  }
}
