import { useEffect, useState } from 'react'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import { Calculator, Download, RefreshCw } from 'lucide-react'

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
  report?: string
}

export function TaxesPage() {
  const {
    currentPortfolio,
    assets,
    taxEvents,
    isLoading,
    fetchPortfolios,
    fetchTransactions,
    fetchCashFlows,
    fetchTaxEvents,
    calculateTaxesServer,
  } = usePortfolioStore()

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [calculating, setCalculating] = useState(false)
  const [calcResult, setCalcResult] = useState<TaxCalculationResult | null>(null)
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => { fetchPortfolios() }, [fetchPortfolios])
  useEffect(() => {
    if (assets.length > 0) fetchTransactions()
    if (currentPortfolio) fetchCashFlows(currentPortfolio.id)
    fetchTaxEvents(selectedYear)
  }, [assets, currentPortfolio, selectedYear, fetchTransactions, fetchCashFlows, fetchTaxEvents])

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      const result = await calculateTaxesServer(selectedYear)
      setCalcResult(result)
    } catch {
      // Error handled by store
    }
    setCalculating(false)
  }

  const handleSaveCalculation = async () => {
    if (!calcResult) return
    setCalculating(true)
    try {
      await calculateTaxesServer(selectedYear, undefined, true)
      await fetchTaxEvents(selectedYear)
    } catch {
      // Error handled by store
    }
    setCalculating(false)
  }

  const handleExportReport = async () => {
    try {
      const result = await calculateTaxesServer(selectedYear, undefined, false, 'report')
      if (result?.report) {
        const blob = new Blob([result.report], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dichiarazione_redditi_${selectedYear}.txt`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // Error handled by store
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calcolo Tasse</h1>
          <p className="text-sm text-muted-foreground">Calcolo imposte secondo la normativa italiana</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} /> Calcola
          </button>
        </div>
      </div>

      {/* Crypto threshold warning */}
      {calcResult?.crypto_threshold?.exceeded && (
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/5 p-4">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Soglia Crypto Superata</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Il valore delle tue crypto (€{calcResult.crypto_threshold.total_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })})
            supera la soglia di €{calcResult.crypto_threshold.threshold.toLocaleString('it-IT')}. Le plusvalenze sono soggette a tassazione al 26%.
          </p>
        </div>
      )}

      {/* Tax Rates Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Capital Gains Standard</p>
          <p className="mt-1 text-xl font-bold text-foreground">26%</p>
          <p className="text-xs text-muted-foreground">Azioni, ETF, Crypto</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Titoli di Stato IT</p>
          <p className="mt-1 text-xl font-bold text-foreground">12.5%</p>
          <p className="text-xs text-muted-foreground">BTP, BOT, CCT</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Dividendi</p>
          <p className="mt-1 text-xl font-bold text-foreground">26%</p>
          <p className="text-xs text-muted-foreground">Imposta sostitutiva</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Interessi</p>
          <p className="mt-1 text-xl font-bold text-foreground">26%</p>
          <p className="text-xs text-muted-foreground">Redditi da capitale</p>
        </div>
      </div>

      {/* Calculation results */}
      {calcResult && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Reddito Imponibile</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                €{calcResult.total_taxable_income.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Imposte Totali Dovute</p>
              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                €{calcResult.total_tax_owed.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Capital Gains Totali</p>
              <p className={`mt-1 text-2xl font-bold ${calcResult.total_capital_gains >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                €{calcResult.total_capital_gains.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Tax breakdown */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Dettaglio Imposte {selectedYear}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border py-2">
                <span className="text-sm text-muted-foreground">Imposta su Capital Gains</span>
                <span className="font-medium text-foreground">€{calcResult.breakdown.capital_gains_tax.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border py-2">
                <span className="text-sm text-muted-foreground">Imposta su Dividendi (€{calcResult.dividend_income.toLocaleString('it-IT', { minimumFractionDigits: 2 })})</span>
                <span className="font-medium text-foreground">€{calcResult.breakdown.dividend_tax.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border py-2">
                <span className="text-sm text-muted-foreground">Imposta su Interessi (€{calcResult.interest_income.toLocaleString('it-IT', { minimumFractionDigits: 2 })})</span>
                <span className="font-medium text-foreground">€{calcResult.breakdown.interest_tax.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-semibold text-foreground">Totale Imposte</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">€{calcResult.total_tax_owed.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Capital Gains detail */}
          {calcResult.capital_gains.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Dettaglio Capital Gains</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Asset</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Acquisto</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Vendita</th>
                      <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">Qtà</th>
                      <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">Guadagno</th>
                      <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">Aliquota</th>
                      <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">Imposta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calcResult.capital_gains.map((g, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-3 py-2 text-sm font-medium text-foreground">{g.asset_name}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {new Date(g.purchase_date).toLocaleDateString('it-IT')} @ €{g.purchase_price.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {new Date(g.sale_date).toLocaleDateString('it-IT')} @ €{g.sale_price.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-foreground">{g.quantity}</td>
                        <td className={`px-3 py-2 text-right text-sm font-medium ${g.gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          €{g.gain.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-foreground">{(g.tax_rate * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-foreground">€{g.tax_owed.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSaveCalculation}
              disabled={calculating}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Calculator className="h-4 w-4" /> Salva Calcolo
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Download className="h-4 w-4" /> Esporta Report
            </button>
          </div>
        </>
      )}

      {/* Saved tax events */}
      {taxEvents.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Eventi Fiscali Salvati ({selectedYear})</h2>
          <div className="space-y-2">
            {taxEvents.map(ev => (
              <div key={ev.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {ev.event_type === 'capital_gain' ? 'Capital Gain' :
                     ev.event_type === 'dividend' ? 'Dividendo' :
                     ev.event_type === 'interest' ? 'Interesse' : ev.event_type}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(ev.event_date).toLocaleDateString('it-IT')} - {ev.notes}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">€{ev.taxable_amount.toFixed(2)}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">Imposta: €{ev.tax_owed.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
