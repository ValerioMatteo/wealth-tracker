import { useMemo } from 'react'
import type { Asset, Transaction, CashFlow, TaxEvent } from '@/types'
import {
  TrendingUp,
  TrendingDown,
  Banknote,
  PiggyBank,
  Receipt,
  Calculator,
  Percent,
} from 'lucide-react'

interface PerformanceMetricsProps {
  assets: Asset[]
  transactions: Transaction[]
  cashFlows: CashFlow[]
  taxEvents: TaxEvent[]
}

export function PerformanceMetrics({ assets, transactions, cashFlows, taxEvents }: PerformanceMetricsProps) {
  const metrics = useMemo(() => {
    const capital = assets.reduce((sum, a) => sum + (a.current_value || 0), 0)
    const investedCapital = assets.reduce((sum, a) => sum + a.purchase_price * a.quantity, 0)
    const priceGain = capital - investedCapital

    // Dividends from cash flows (received only)
    const dividends = cashFlows
      .filter(cf => !cf.is_forecasted && (cf.flow_type === 'dividend' || cf.flow_type === 'coupon'))
      .reduce((sum, cf) => sum + cf.amount, 0)

    // Realized gain from sell transactions
    const sellTx = transactions.filter(t => t.transaction_type === 'sell')
    const realizedGain = sellTx.reduce((sum, t) => {
      const asset = assets.find(a => a.id === t.asset_id)
      if (!asset) return sum
      return sum + (t.price - asset.purchase_price) * t.quantity
    }, 0)

    // Transaction costs
    const transactionCosts = transactions.reduce((sum, t) => sum + (t.fees || 0), 0)

    // Taxes
    const taxes = taxEvents.reduce((sum, te) => sum + te.tax_owed, 0)

    // Running costs (from asset metadata TER if available)
    const runningCosts = assets.reduce((sum, a) => {
      const ter = (a.metadata?.ter as number) || 0
      return sum + (a.current_value || 0) * (ter / 100)
    }, 0)

    // Total return
    const totalReturn = priceGain + dividends + realizedGain - transactionCosts - taxes - runningCosts
    const totalReturnPercent = investedCapital > 0 ? (totalReturn / investedCapital) * 100 : 0

    // IRR (simplified approximation)
    // Uses the formula: IRR ≈ (total return / invested capital) / years
    const oldestPurchase = assets.reduce((min, a) => {
      const d = new Date(a.purchase_date).getTime()
      return d < min ? d : min
    }, Date.now())
    const yearsHeld = Math.max((Date.now() - oldestPurchase) / (365.25 * 24 * 60 * 60 * 1000), 0.1)
    const irr = investedCapital > 0
      ? (Math.pow((capital + dividends + realizedGain) / investedCapital, 1 / yearsHeld) - 1) * 100
      : 0

    // TWRR (simplified - assumes equal weighting)
    const twrr = investedCapital > 0
      ? (Math.pow(capital / investedCapital, 1 / yearsHeld) - 1) * 100
      : 0

    return {
      capital,
      investedCapital,
      priceGain,
      dividends,
      realizedGain,
      transactionCosts,
      taxes,
      runningCosts,
      totalReturn,
      totalReturnPercent,
      irr,
      twrr,
    }
  }, [assets, transactions, cashFlows, taxEvents])

  const rows: { label: string; value: number; format: 'currency' | 'percent'; icon: React.ReactNode; highlight?: boolean }[] = [
    { label: 'Capitale', value: metrics.capital, format: 'currency', icon: <Banknote className="h-4 w-4" /> },
    { label: 'Capitale Investito', value: metrics.investedCapital, format: 'currency', icon: <PiggyBank className="h-4 w-4" /> },
    { label: 'Guadagno di Prezzo', value: metrics.priceGain, format: 'currency', icon: metrics.priceGain >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" /> },
    { label: 'Dividendi / Cedole', value: metrics.dividends, format: 'currency', icon: <Banknote className="h-4 w-4" /> },
    { label: 'Guadagno Realizzato', value: metrics.realizedGain, format: 'currency', icon: metrics.realizedGain >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" /> },
    { label: 'Costi di Transazione', value: -metrics.transactionCosts, format: 'currency', icon: <Receipt className="h-4 w-4" /> },
    { label: 'Tasse', value: -metrics.taxes, format: 'currency', icon: <Calculator className="h-4 w-4" /> },
    { label: 'Costi Correnti (TER)', value: -metrics.runningCosts, format: 'currency', icon: <Receipt className="h-4 w-4" /> },
    { label: 'Rendimento Totale', value: metrics.totalReturn, format: 'currency', icon: <TrendingUp className="h-4 w-4" />, highlight: true },
    { label: 'Rendimento Totale %', value: metrics.totalReturnPercent, format: 'percent', icon: <Percent className="h-4 w-4" />, highlight: true },
    { label: 'Tasso di Rendimento Interno (IRR)', value: metrics.irr, format: 'percent', icon: <Percent className="h-4 w-4" /> },
    { label: 'Rendimento Ponderato nel Tempo (TWRR)', value: metrics.twrr, format: 'percent', icon: <Percent className="h-4 w-4" /> },
  ]

  const formatValue = (value: number, format: 'currency' | 'percent') => {
    if (format === 'percent') {
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
    }
    return `${value >= 0 ? '+' : ''}€${Math.abs(value).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
  }

  const getValueColor = (value: number, label: string) => {
    if (label === 'Capitale' || label === 'Capitale Investito') return 'text-foreground'
    if (value > 0) return 'text-emerald-600 dark:text-emerald-400'
    if (value < 0) return 'text-red-600 dark:text-red-400'
    return 'text-foreground'
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Performance</h2>

      <div className="space-y-1">
        {rows.map(row => (
          <div
            key={row.label}
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
              row.highlight ? 'bg-secondary/50 font-semibold' : 'hover:bg-secondary/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{row.icon}</span>
              <span className={`text-sm ${row.highlight ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                {row.label}
              </span>
            </div>
            <span className={`text-sm font-medium ${getValueColor(row.value, row.label)}`}>
              {row.label === 'Capitale' || row.label === 'Capitale Investito'
                ? `€${row.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                : formatValue(row.value, row.format)
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
