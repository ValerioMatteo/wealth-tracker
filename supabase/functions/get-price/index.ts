// supabase/functions/get-price/index.ts
// Single symbol price lookup endpoint (used by frontend asset form)
// Deploy with: supabase functions deploy get-price

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAuthUser } from '../_shared/auth.ts'
import { lookupPrice } from '../_shared/priceFetchers.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    // Verify authentication
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Non autenticato', 401)

    const { symbol, asset_type, currency = 'EUR' } = await req.json()

    if (!symbol || !asset_type) {
      return errorResponse('symbol e asset_type sono obbligatori')
    }

    // Lookup price using shared fetchers
    const result = await lookupPrice(symbol, asset_type, currency)

    if (!result) {
      return errorResponse(`Prezzo non trovato per ${symbol} (${asset_type})`, 404)
    }

    return jsonResponse({
      price: result.price,
      name: result.name || null,
      source: result.source,
      currency: result.currency || currency,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('get-price error:', error)
    return errorResponse(error.message || 'Errore nel recupero del prezzo', 500)
  }
})
