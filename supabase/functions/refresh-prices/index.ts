// supabase/functions/refresh-prices/index.ts
// Deploy with: supabase functions deploy refresh-prices

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Asset {
  id: string
  asset_type: string
  symbol: string | null
  current_price: number
  metadata: Record<string, unknown>
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { portfolio_id } = await req.json()

    if (!portfolio_id) {
      throw new Error('portfolio_id is required')
    }

    // Verifica autenticazione: l'utente deve possedere il portfolio
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: portfolioCheck } = await userClient
        .from('portfolios')
        .select('id')
        .eq('id', portfolio_id)
        .single()

      if (!portfolioCheck) {
        return new Response(
          JSON.stringify({ error: 'Portfolio non trovato o non autorizzato' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get all assets in portfolio that need price updates (include metadata for ISIN bonds)
    const { data: assets, error: assetsError } = await supabaseClient
      .from('assets')
      .select('id, asset_type, symbol, current_price, metadata')
      .eq('portfolio_id', portfolio_id)
      .not('symbol', 'is', null)

    if (assetsError) throw assetsError

    const updates: Array<{ id: string; price: number; symbol: string }> = []

    // Fetch prices for each asset
    for (const asset of assets as Asset[]) {
      try {
        let newPrice: number | null = null

        switch (asset.asset_type) {
          case 'stock':
          case 'etf':
            newPrice = await fetchStockPrice(asset.symbol!)
            break

          case 'bond': {
            // Prova il simbolo diretto, poi ISIN con suffissi borsa
            try {
              newPrice = await fetchStockPrice(asset.symbol!)
            } catch {
              // Fallback: prova ISIN da metadata
              const isin = asset.metadata?.isin as string | undefined
              if (isin) {
                newPrice = await fetchBondByISIN(isin)
              }
            }
            break
          }

          case 'crypto':
            newPrice = await fetchCryptoPrice(asset.symbol!)
            break

          case 'commodity':
            newPrice = await fetchMetalPrice(asset.symbol!)
            break

          default:
            // Skip assets without automated pricing (real_estate, luxury, cash)
            continue
        }

        if (newPrice !== null && newPrice !== asset.current_price) {
          updates.push({ id: asset.id, price: newPrice, symbol: asset.symbol! })

          // Store in price history
          await supabaseClient.from('price_history').insert({
            symbol: asset.symbol,
            asset_type: asset.asset_type,
            price: newPrice,
            source: 'edge_function',
            metadata: { portfolio_id },
          })
        }
      } catch (error) {
        console.error(`Error fetching price for ${asset.symbol}:`, error)
        // Continue with other assets
      }
    }

    // Update all assets in batch
    if (updates.length > 0) {
      for (const update of updates) {
        await supabaseClient
          .from('assets')
          .update({
            current_price: update.price,
            last_updated: new Date().toISOString(),
          })
          .eq('id', update.id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updates.length,
        total: assets?.length || 0,
        details: updates.map(u => ({ symbol: u.symbol, price: u.price })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in refresh-prices function:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// --- Helper functions ---

async function fetchStockPrice(symbol: string): Promise<number> {
  // Yahoo Finance API (free, no API key needed)
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
  )
  const data = await response.json()
  const quote = data.chart.result[0].meta
  return quote.regularMarketPrice
}

async function fetchBondByISIN(isin: string): Promise<number | null> {
  // Prova ISIN diretto, poi con suffissi borsa europee
  try {
    return await fetchStockPrice(isin)
  } catch {
    // Fallback con suffissi
  }

  const suffixes = ['.MI', '.F', '.DE', '.L', '.PA']
  for (const suffix of suffixes) {
    try {
      return await fetchStockPrice(isin + suffix)
    } catch {
      continue
    }
  }
  return null
}

async function fetchCryptoPrice(symbol: string): Promise<number> {
  // CoinGecko API (free tier)
  const symbolMap: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'ADA': 'cardano',
    'XRP': 'ripple',
    'DOT': 'polkadot',
    'DOGE': 'dogecoin',
    'AVAX': 'avalanche-2',
    'MATIC': 'matic-network',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
  }

  const coinId = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase()

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur`
  )
  const data = await response.json()
  return data[coinId].eur
}

async function fetchMetalPrice(metal: string): Promise<number> {
  // Metalli preziosi via Yahoo Finance Futures
  const symbolMap: Record<string, string> = {
    'GOLD': 'GC=F',
    'SILVER': 'SI=F',
    'PLATINUM': 'PL=F',
    'PALLADIUM': 'PA=F',
    'XAU': 'GC=F',
    'XAG': 'SI=F',
    'XPT': 'PL=F',
    'XPD': 'PA=F',
  }

  const yahooSymbol = symbolMap[metal.toUpperCase()]
  if (!yahooSymbol) throw new Error(`Unknown metal: ${metal}`)

  return await fetchStockPrice(yahooSymbol)
}
