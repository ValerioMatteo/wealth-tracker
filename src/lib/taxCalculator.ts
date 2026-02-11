// src/lib/taxCalculator.ts

import type { Asset, Transaction, CashFlow, TaxEvent } from '@/types'

interface CapitalGain {
  asset_id: string
  asset_name: string
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
}

export class ItalianTaxCalculator {
  // Italian tax rates (2024)
  private readonly TAX_RATES = {
    CAPITAL_GAINS_STANDARD: 0.26,      // 26% for most assets
    CAPITAL_GAINS_GOV_BONDS: 0.125,    // 12.5% for Italian gov bonds (BTP, BOT, etc)
    DIVIDENDS: 0.26,                    // 26% on dividends
    INTEREST: 0.26,                     // 26% on interest income
    CRYPTO: 0.26,                       // 26% on crypto gains
  }

  // Exemptions and thresholds
  private readonly CRYPTO_THRESHOLD = 2000 // €2000 threshold for crypto holdings

  /**
   * Calculate capital gains using FIFO method
   */
  calculateCapitalGains(
    transactions: Transaction[],
    assets: Asset[],
    taxYear: number
  ): CapitalGain[] {
    const gains: CapitalGain[] = []
    
    // Group transactions by asset
    const assetTransactions = new Map<string, Transaction[]>()
    transactions.forEach(tx => {
      const existing = assetTransactions.get(tx.asset_id) || []
      assetTransactions.set(tx.asset_id, [...existing, tx])
    })

    // Calculate gains for each asset
    assetTransactions.forEach((txs, assetId) => {
      const asset = assets.find(a => a.id === assetId)
      if (!asset) return

      // Sort by date
      const sortedTxs = [...txs].sort((a, b) => 
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      )

      // FIFO queue for purchases
      const purchaseQueue: Array<{ quantity: number; price: number; date: string }> = []

      sortedTxs.forEach(tx => {
        const txDate = new Date(tx.transaction_date)
        const txYear = txDate.getFullYear()

        if (tx.transaction_type === 'buy') {
          purchaseQueue.push({
            quantity: tx.quantity,
            price: tx.price,
            date: tx.transaction_date,
          })
        } else if (tx.transaction_type === 'sell' && txYear === taxYear) {
          let remainingSellQuantity = tx.quantity
          const salePrice = tx.price

          while (remainingSellQuantity > 0 && purchaseQueue.length > 0) {
            const purchase = purchaseQueue[0]
            const quantityToSell = Math.min(remainingSellQuantity, purchase.quantity)

            const purchaseCost = purchase.price * quantityToSell
            const saleProceeds = salePrice * quantityToSell
            const gain = saleProceeds - purchaseCost

            // Determine tax rate based on asset type
            let taxRate = this.TAX_RATES.CAPITAL_GAINS_STANDARD
            if (asset.asset_type === 'bond' && asset.metadata.country === 'IT') {
              taxRate = this.TAX_RATES.CAPITAL_GAINS_GOV_BONDS
            } else if (asset.asset_type === 'crypto') {
              taxRate = this.TAX_RATES.CRYPTO
            }

            gains.push({
              asset_id: assetId,
              asset_name: asset.name,
              purchase_date: purchase.date,
              sale_date: tx.transaction_date,
              purchase_price: purchase.price,
              sale_price: salePrice,
              quantity: quantityToSell,
              gain,
              tax_rate: taxRate,
              tax_owed: gain > 0 ? gain * taxRate : 0,
            })

            // Update quantities
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

  /**
   * Calculate dividend and interest income
   */
  calculateDividendIncome(cashFlows: CashFlow[], taxYear: number): number {
    return cashFlows
      .filter(cf => {
        const year = new Date(cf.payment_date).getFullYear()
        return year === taxYear && 
               (cf.flow_type === 'dividend' || cf.flow_type === 'coupon') &&
               !cf.is_forecasted
      })
      .reduce((sum, cf) => sum + cf.amount, 0)
  }

  /**
   * Calculate interest income
   */
  calculateInterestIncome(cashFlows: CashFlow[], taxYear: number): number {
    return cashFlows
      .filter(cf => {
        const year = new Date(cf.payment_date).getFullYear()
        return year === taxYear && cf.flow_type === 'interest' && !cf.is_forecasted
      })
      .reduce((sum, cf) => sum + cf.amount, 0)
  }

  /**
   * Main calculation function
   */
  calculateTaxes(
    transactions: Transaction[],
    assets: Asset[],
    cashFlows: CashFlow[],
    taxYear: number
  ): TaxCalculationResult {
    // Calculate capital gains
    const capitalGains = this.calculateCapitalGains(transactions, assets, taxYear)
    const totalCapitalGains = capitalGains.reduce((sum, g) => sum + g.gain, 0)
    const capitalGainsTax = capitalGains.reduce((sum, g) => sum + g.tax_owed, 0)

    // Calculate dividend income
    const dividendIncome = this.calculateDividendIncome(cashFlows, taxYear)
    const dividendTax = dividendIncome * this.TAX_RATES.DIVIDENDS

    // Calculate interest income
    const interestIncome = this.calculateInterestIncome(cashFlows, taxYear)
    const interestTax = interestIncome * this.TAX_RATES.INTEREST

    return {
      tax_year: taxYear,
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
    }
  }

  /**
   * Generate tax events for database storage
   */
  generateTaxEvents(
    userId: string,
    transactions: Transaction[],
    assets: Asset[],
    cashFlows: CashFlow[],
    taxYear: number
  ): TaxEvent[] {
    const events: TaxEvent[] = []
    const calculation = this.calculateTaxes(transactions, assets, cashFlows, taxYear)

    // Capital gains events
    calculation.capital_gains.forEach(gain => {
      if (gain.gain > 0) {
        events.push({
          id: '', // Will be generated by Supabase
          user_id: userId,
          tax_year: taxYear,
          event_type: 'capital_gain',
          taxable_amount: gain.gain,
          tax_rate: gain.tax_rate,
          tax_owed: gain.tax_owed,
          asset_id: gain.asset_id,
          event_date: gain.sale_date,
          notes: `Sale of ${gain.quantity} units of ${gain.asset_name}`,
          created_at: new Date().toISOString(),
        })
      }
    })

    // Dividend events
    const dividendFlows = cashFlows.filter(cf => {
      const year = new Date(cf.payment_date).getFullYear()
      return year === taxYear && cf.flow_type === 'dividend' && !cf.is_forecasted
    })

    dividendFlows.forEach(cf => {
      events.push({
        id: '',
        user_id: userId,
        tax_year: taxYear,
        event_type: 'dividend',
        taxable_amount: cf.amount,
        tax_rate: this.TAX_RATES.DIVIDENDS,
        tax_owed: cf.amount * this.TAX_RATES.DIVIDENDS,
        asset_id: cf.asset_id,
        event_date: cf.payment_date,
        notes: 'Dividend payment',
        created_at: new Date().toISOString(),
      })
    })

    // Interest events
    const interestFlows = cashFlows.filter(cf => {
      const year = new Date(cf.payment_date).getFullYear()
      return year === taxYear && cf.flow_type === 'interest' && !cf.is_forecasted
    })

    interestFlows.forEach(cf => {
      events.push({
        id: '',
        user_id: userId,
        tax_year: taxYear,
        event_type: 'interest',
        taxable_amount: cf.amount,
        tax_rate: this.TAX_RATES.INTEREST,
        tax_owed: cf.amount * this.TAX_RATES.INTEREST,
        asset_id: cf.asset_id,
        event_date: cf.payment_date,
        notes: 'Interest payment',
        created_at: new Date().toISOString(),
      })
    })

    return events
  }

  /**
   * Check if crypto holdings exceed the €2000 threshold
   */
  checkCryptoThreshold(assets: Asset[]): {
    exceeded: boolean
    totalValue: number
    threshold: number
  } {
    const cryptoAssets = assets.filter(a => a.asset_type === 'crypto')
    const totalValue = cryptoAssets.reduce((sum, a) => sum + a.current_value, 0)

    return {
      exceeded: totalValue > this.CRYPTO_THRESHOLD,
      totalValue,
      threshold: this.CRYPTO_THRESHOLD,
    }
  }

  /**
   * Generate tax report summary for export
   */
  generateTaxReport(
    transactions: Transaction[],
    assets: Asset[],
    cashFlows: CashFlow[],
    taxYear: number
  ): string {
    const calculation = this.calculateTaxes(transactions, assets, cashFlows, taxYear)

    let report = `DICHIARAZIONE REDDITI ${taxYear}\n`
    report += `${'='.repeat(50)}\n\n`

    report += `CAPITAL GAINS:\n`
    calculation.capital_gains.forEach((gain, idx) => {
      report += `  ${idx + 1}. ${gain.asset_name}\n`
      report += `     Acquisto: ${gain.purchase_date} @ €${gain.purchase_price.toFixed(2)}\n`
      report += `     Vendita: ${gain.sale_date} @ €${gain.sale_price.toFixed(2)}\n`
      report += `     Quantità: ${gain.quantity}\n`
      report += `     Guadagno: €${gain.gain.toFixed(2)}\n`
      report += `     Imposta (${(gain.tax_rate * 100).toFixed(1)}%): €${gain.tax_owed.toFixed(2)}\n\n`
    })

    report += `\nREDDITI DA CAPITALE:\n`
    report += `  Dividendi: €${calculation.dividend_income.toFixed(2)}\n`
    report += `  Imposta dividendi: €${calculation.breakdown.dividend_tax.toFixed(2)}\n`
    report += `  Interessi: €${calculation.interest_income.toFixed(2)}\n`
    report += `  Imposta interessi: €${calculation.breakdown.interest_tax.toFixed(2)}\n\n`

    report += `\nTOTALE:\n`
    report += `  Reddito imponibile: €${calculation.total_taxable_income.toFixed(2)}\n`
    report += `  Imposte dovute: €${calculation.total_tax_owed.toFixed(2)}\n`

    return report
  }
}

export const taxCalculator = new ItalianTaxCalculator()
