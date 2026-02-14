// supabase/functions/calculate-taxes/index.ts
// Server-side Italian tax calculation (FIFO method)
// Ported from src/lib/taxCalculator.ts (ItalianTaxCalculator)
// Deploy with: supabase functions deploy calculate-taxes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/auth.ts'

// Italian tax rates (2024)
const TAX_RATES = {
  CAPITAL_GAINS_STANDARD: 0.26,
  CAPITAL_GAINS_GOV_BONDS: 0.125,
  DIVIDENDS: 0.26,
  INTEREST: 0.26,
  CRYPTO: 0.26,
}

const CRYPTO_THRESHOLD = 2000

interface CapitalGain {
  asset_id: string
  asset_name: string
  asset_type: string
  purchase_date: string
  sale_date: string
  purchase_price: number
  sale_price: number
  quantity: number
  gain: number
  tax_rate: number
  tax_owed: number
}

interface TaxCalculationResult {
  tax_year: number
  capital_gains: CapitalGain[]
  total_capital_gains: number
  dividend_income: number
  interest_income: number
  total_taxable_income: number
  total_tax_owed: number
  breakdown: {
    capital_gains_tax: number
    dividend_tax: number
    interest_tax: number
  }
  crypto_threshold: {
    exceeded: boolean
    total_value: number
    threshold: number
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Non autenticato', 401)

    const { tax_year, portfolio_ids, save = false, format } = await req.json()

    if (!tax_year) return errorResponse('tax_year e\' obbligatorio')

    const supabaseAdmin = createAdminClient()

    // Get user's portfolios
    let portfolioFilter = portfolio_ids as string[] | undefined
    if (!portfolioFilter || portfolioFilter.length === 0) {
      const { data: portfolios } = await supabaseAdmin
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)

      portfolioFilter = (portfolios || []).map((p: { id: string }) => p.id)
    }

    if (!portfolioFilter || portfolioFilter.length === 0) {
      return jsonResponse(emptyResult(tax_year))
    }

    // Fetch all assets for these portfolios
    const { data: assets } = await supabaseAdmin
      .from('assets')
      .select('*')
      .in('portfolio_id', portfolioFilter)

    if (!assets || assets.length === 0) {
      return jsonResponse(emptyResult(tax_year))
    }

    const assetIds = assets.map((a: { id: string }) => a.id)

    // Fetch transactions (batched for large datasets)
    const allTransactions: Array<Record<string, unknown>> = []
    const batchSize = 100
    for (let i = 0; i < assetIds.length; i += batchSize) {
      const batch = assetIds.slice(i, i + batchSize)
      const { data: txs } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .in('asset_id', batch)
        .order('transaction_date', { ascending: true })

      if (txs) allTransactions.push(...txs)
    }

    // Fetch cash flows
    const { data: cashFlows } = await supabaseAdmin
      .from('cash_flows')
      .select('*')
      .in('portfolio_id', portfolioFilter)

    // Calculate capital gains (FIFO)
    const capitalGains = calculateCapitalGains(allTransactions, assets, tax_year)
    const totalCapitalGains = capitalGains.reduce((sum, g) => sum + g.gain, 0)
    const capitalGainsTax = capitalGains.reduce((sum, g) => sum + g.tax_owed, 0)

    // Calculate dividend income
    const dividendIncome = (cashFlows || [])
      .filter((cf: Record<string, unknown>) => {
        const year = new Date(cf.payment_date as string).getFullYear()
        return year === tax_year &&
          (cf.flow_type === 'dividend' || cf.flow_type === 'coupon') &&
          !cf.is_forecasted
      })
      .reduce((sum: number, cf: Record<string, unknown>) => sum + (cf.amount as number), 0)
    const dividendTax = dividendIncome * TAX_RATES.DIVIDENDS

    // Calculate interest income
    const interestIncome = (cashFlows || [])
      .filter((cf: Record<string, unknown>) => {
        const year = new Date(cf.payment_date as string).getFullYear()
        return year === tax_year && cf.flow_type === 'interest' && !cf.is_forecasted
      })
      .reduce((sum: number, cf: Record<string, unknown>) => sum + (cf.amount as number), 0)
    const interestTax = interestIncome * TAX_RATES.INTEREST

    // Crypto threshold check
    const cryptoAssets = assets.filter((a: Record<string, unknown>) => a.asset_type === 'crypto')
    const cryptoTotalValue = cryptoAssets.reduce(
      (sum: number, a: Record<string, unknown>) => sum + ((a.quantity as number) * (a.current_price as number)),
      0
    )

    const result: TaxCalculationResult = {
      tax_year,
      capital_gains: capitalGains,
      total_capital_gains: totalCapitalGains,
      dividend_income: dividendIncome,
      interest_income: interestIncome,
      total_taxable_income: totalCapitalGains + dividendIncome + interestIncome,
      total_tax_owed: capitalGainsTax + dividendTax + interestTax,
      breakdown: {
        capital_gains_tax: capitalGainsTax,
        dividend_tax: dividendTax,
        interest_tax: interestTax,
      },
      crypto_threshold: {
        exceeded: cryptoTotalValue > CRYPTO_THRESHOLD,
        total_value: cryptoTotalValue,
        threshold: CRYPTO_THRESHOLD,
      },
    }

    // Optionally save tax events to DB
    if (save) {
      await saveTaxEvents(supabaseAdmin, user.id, result)
    }

    // Optionally return formatted text report
    if (format === 'report') {
      return jsonResponse({ ...result, report: generateReport(result) })
    }

    return jsonResponse(result)
  } catch (error) {
    console.error('calculate-taxes error:', error)
    return errorResponse(error.message || 'Errore nel calcolo delle tasse', 500)
  }
})

function calculateCapitalGains(
  transactions: Array<Record<string, unknown>>,
  assets: Array<Record<string, unknown>>,
  taxYear: number
): CapitalGain[] {
  const gains: CapitalGain[] = []

  // Group transactions by asset
  const assetTransactions = new Map<string, Array<Record<string, unknown>>>()
  transactions.forEach(tx => {
    const assetId = tx.asset_id as string
    const existing = assetTransactions.get(assetId) || []
    assetTransactions.set(assetId, [...existing, tx])
  })

  assetTransactions.forEach((txs, assetId) => {
    const asset = assets.find((a: Record<string, unknown>) => a.id === assetId)
    if (!asset) return

    const sortedTxs = [...txs].sort((a, b) =>
      new Date(a.transaction_date as string).getTime() - new Date(b.transaction_date as string).getTime()
    )

    // FIFO queue for purchases
    const purchaseQueue: Array<{ quantity: number; price: number; date: string }> = []

    sortedTxs.forEach(tx => {
      const txDate = new Date(tx.transaction_date as string)
      const txYear = txDate.getFullYear()

      if (tx.transaction_type === 'buy') {
        purchaseQueue.push({
          quantity: tx.quantity as number,
          price: tx.price as number,
          date: tx.transaction_date as string,
        })
      } else if (tx.transaction_type === 'sell' && txYear === taxYear) {
        let remainingSellQuantity = tx.quantity as number
        const salePrice = tx.price as number

        while (remainingSellQuantity > 0 && purchaseQueue.length > 0) {
          const purchase = purchaseQueue[0]
          const quantityToSell = Math.min(remainingSellQuantity, purchase.quantity)

          const purchaseCost = purchase.price * quantityToSell
          const saleProceeds = salePrice * quantityToSell
          const gain = saleProceeds - purchaseCost

          // Determine tax rate
          let taxRate = TAX_RATES.CAPITAL_GAINS_STANDARD
          const assetType = asset.asset_type as string
          const metadata = asset.metadata as Record<string, unknown> | null
          if (assetType === 'bond' && metadata?.country === 'IT') {
            taxRate = TAX_RATES.CAPITAL_GAINS_GOV_BONDS
          } else if (assetType === 'crypto') {
            taxRate = TAX_RATES.CRYPTO
          }

          gains.push({
            asset_id: assetId,
            asset_name: asset.name as string,
            asset_type: assetType,
            purchase_date: purchase.date,
            sale_date: tx.transaction_date as string,
            purchase_price: purchase.price,
            sale_price: salePrice,
            quantity: quantityToSell,
            gain,
            tax_rate: taxRate,
            tax_owed: gain > 0 ? gain * taxRate : 0,
          })

          purchase.quantity -= quantityToSell
          remainingSellQuantity -= quantityToSell

          if (purchase.quantity === 0) {
            purchaseQueue.shift()
          }
        }
      }
    })
  })

  return gains
}

async function saveTaxEvents(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  result: TaxCalculationResult
) {
  const events: Array<Record<string, unknown>> = []

  // Capital gains events
  result.capital_gains.forEach(gain => {
    if (gain.gain > 0) {
      events.push({
        user_id: userId,
        tax_year: result.tax_year,
        event_type: 'capital_gain',
        taxable_amount: gain.gain,
        tax_rate: gain.tax_rate,
        tax_owed: gain.tax_owed,
        asset_id: gain.asset_id,
        event_date: gain.sale_date,
        notes: `Vendita di ${gain.quantity} unita' di ${gain.asset_name}`,
      })
    }
  })

  if (events.length > 0) {
    await supabaseAdmin.from('tax_events').insert(events)
  }
}

function generateReport(result: TaxCalculationResult): string {
  let report = `DICHIARAZIONE REDDITI ${result.tax_year}\n`
  report += `${'='.repeat(50)}\n\n`

  report += `CAPITAL GAINS:\n`
  result.capital_gains.forEach((gain, idx) => {
    report += `  ${idx + 1}. ${gain.asset_name}\n`
    report += `     Acquisto: ${gain.purchase_date} @ EUR ${gain.purchase_price.toFixed(2)}\n`
    report += `     Vendita: ${gain.sale_date} @ EUR ${gain.sale_price.toFixed(2)}\n`
    report += `     Quantita': ${gain.quantity}\n`
    report += `     Guadagno: EUR ${gain.gain.toFixed(2)}\n`
    report += `     Imposta (${(gain.tax_rate * 100).toFixed(1)}%): EUR ${gain.tax_owed.toFixed(2)}\n\n`
  })

  report += `\nREDDITI DA CAPITALE:\n`
  report += `  Dividendi: EUR ${result.dividend_income.toFixed(2)}\n`
  report += `  Imposta dividendi: EUR ${result.breakdown.dividend_tax.toFixed(2)}\n`
  report += `  Interessi: EUR ${result.interest_income.toFixed(2)}\n`
  report += `  Imposta interessi: EUR ${result.breakdown.interest_tax.toFixed(2)}\n\n`

  report += `\nTOTALE:\n`
  report += `  Reddito imponibile: EUR ${result.total_taxable_income.toFixed(2)}\n`
  report += `  Imposte dovute: EUR ${result.total_tax_owed.toFixed(2)}\n`

  return report
}

function emptyResult(taxYear: number): TaxCalculationResult {
  return {
    tax_year: taxYear,
    capital_gains: [],
    total_capital_gains: 0,
    dividend_income: 0,
    interest_income: 0,
    total_taxable_income: 0,
    total_tax_owed: 0,
    breakdown: { capital_gains_tax: 0, dividend_tax: 0, interest_tax: 0 },
    crypto_threshold: { exceeded: false, total_value: 0, threshold: CRYPTO_THRESHOLD },
  }
}
