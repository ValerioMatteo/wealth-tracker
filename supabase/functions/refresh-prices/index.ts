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

    // Get all assets in portfolio that need price updates
    const { data: assets, error: assetsError } = await supabaseClient
      .from('assets')
      .select('id, asset_type, symbol, current_price')
      .eq('portfolio_id', portfolio_id)
      .not('symbol', 'is', null)

    if (assetsError) throw assetsError

    const updates: Array<{ id: string; price: number }> = []

    // Fetch prices for each asset
    for (const asset of assets as Asset[]) {
      try {
        let newPrice: number | null = null

        switch (asset.asset_type) {
          case 'stock':
          case 'etf':
            newPrice = await fetchStockPrice(asset.symbol!)
            break
          case 'crypto':
            newPrice = await fetchCryptoPrice(asset.symbol!)
            break
          case 'commodity':
            if (asset.symbol && ['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM'].includes(asset.symbol.toUpperCase())) {
              newPrice = await fetchMetalPrice(asset.symbol)
            }
            break
          default:
            // Skip assets without automated pricing
            continue
        }

        if (newPrice !== null && newPrice !== asset.current_price) {
          updates.push({ id: asset.id, price: newPrice })

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

// Helper functions to fetch prices from various APIs

async function fetchStockPrice(symbol: string): Promise<number> {
  // Using Yahoo Finance API (free, no API key needed)
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    )
    const data = await response.json()
    
    const quote = data.chart.result[0].meta
    return quote.regularMarketPrice
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error)
    throw error
  }
}

async function fetchCryptoPrice(symbol: string): Promise<number> {
  // Using CoinGecko API (free tier)
  const symbolMap: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'ADA': 'cardano',
    'XRP': 'ripple',
  }

  const coinId = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase()

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur`
    )
    const data = await response.json()
    
    return data[coinId].eur
  } catch (error) {
    console.error(`Error fetching crypto price for ${symbol}:`, error)
    throw error
  }
}

async function fetchMetalPrice(metal: string): Promise<number> {
  // Simplified - in production, use a real metals API
  // This is a placeholder that returns approximate values
  const metalPrices: Record<string, number> = {
    'GOLD': 1950,
    'SILVER': 24.5,
    'PLATINUM': 950,
    'PALLADIUM': 1050,
  }

  const normalizedMetal = metal.toUpperCase()
  
  if (metalPrices[normalizedMetal]) {
    // In production, fetch from actual API
    // For now, return placeholder with small random variation
    const basePrice = metalPrices[normalizedMetal]
    const variation = (Math.random() - 0.5) * 0.02 // ±1% variation
    return basePrice * (1 + variation)
  }

  throw new Error(`Unknown metal: ${metal}`)
}
