// supabase/functions/get-portfolio-analytics/index.ts
// Server-side portfolio analytics computation
// Deploy with: supabase functions deploy get-portfolio-analytics

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/auth.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Non autenticato', 401)

    const { portfolio_id } = await req.json()
    if (!portfolio_id) return errorResponse('portfolio_id e\' obbligatorio')

    const supabaseAdmin = createAdminClient()

    // Verify ownership
    const { data: portfolio } = await supabaseAdmin
      .from('portfolios')
      .select('id, name, currency')
      .eq('id', portfolio_id)
      .eq('user_id', user.id)
      .single()

    if (!portfolio) return errorResponse('Portfolio non trovato o non autorizzato', 403)

    // Fetch all assets
    const { data: assets } = await supabaseAdmin
      .from('assets')
      .select('*')
      .eq('portfolio_id', portfolio_id)
      .order('name', { ascending: true })

    if (!assets || assets.length === 0) {
      return jsonResponse({
        portfolio_id,
        portfolio_name: portfolio.name,
        total_value: 0,
        total_cost: 0,
        total_gain: 0,
        gain_percent: 0,
        asset_count: 0,
        allocation: [],
        top_performers: [],
        worst_performers: [],
      })
    }

    // Calculate totals
    const totalValue = assets.reduce((sum: number, a: Record<string, unknown>) =>
      sum + ((a.quantity as number) * (a.current_price as number)), 0)
    const totalCost = assets.reduce((sum: number, a: Record<string, unknown>) =>
      sum + ((a.quantity as number) * (a.purchase_price as number)), 0)
    const totalGain = totalValue - totalCost
    const gainPercent = totalCost > 0 ? ((totalGain / totalCost) * 100) : 0

    // Calculate allocation by asset_type
    const allocationMap = new Map<string, { value: number; count: number }>()
    assets.forEach((a: Record<string, unknown>) => {
      const type = a.asset_type as string
      const value = (a.quantity as number) * (a.current_price as number)
      const existing = allocationMap.get(type) || { value: 0, count: 0 }
      allocationMap.set(type, { value: existing.value + value, count: existing.count + 1 })
    })

    const allocation = Array.from(allocationMap.entries())
      .map(([asset_type, data]) => ({
        asset_type,
        value: Math.round(data.value * 100) / 100,
        percentage: totalValue > 0 ? Math.round((data.value / totalValue) * 10000) / 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value)

    // Top/worst performers (by gain %)
    const performanceAssets = assets
      .filter((a: Record<string, unknown>) => (a.purchase_price as number) > 0)
      .map((a: Record<string, unknown>) => {
        const gainPct = (((a.current_price as number) - (a.purchase_price as number)) / (a.purchase_price as number)) * 100
        return {
          id: a.id,
          name: a.name,
          asset_type: a.asset_type,
          symbol: a.symbol,
          current_value: (a.quantity as number) * (a.current_price as number),
          purchase_price: a.purchase_price,
          current_price: a.current_price,
          quantity: a.quantity,
          gain_percent: Math.round(gainPct * 100) / 100,
        }
      })

    const sorted = [...performanceAssets].sort((a, b) => b.gain_percent - a.gain_percent)
    const topPerformers = sorted.slice(0, 5)
    const worstPerformers = sorted.slice(-5).reverse()

    return jsonResponse({
      portfolio_id,
      portfolio_name: portfolio.name,
      total_value: Math.round(totalValue * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      total_gain: Math.round(totalGain * 100) / 100,
      gain_percent: Math.round(gainPercent * 100) / 100,
      asset_count: assets.length,
      allocation,
      top_performers: topPerformers,
      worst_performers: worstPerformers,
    })
  } catch (error) {
    console.error('get-portfolio-analytics error:', error)
    return errorResponse(error.message || 'Errore nel calcolo delle analytics', 500)
  }
})
