import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { CashFlow, Asset } from '@/types'

interface CashFlowChartProps {
  cashFlows: CashFlow[]
  assets: Asset[]
}

type ViewMode = 'cumulative' | 'instrument'

export function CashFlowChart({ cashFlows, assets }: CashFlowChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cumulative')

  const yearlyData = useMemo(() => {
    if (cashFlows.length === 0) return { historical: [], forecasted: [], yoyGrowth: 0, totalYield: 0 }

    const byYear = new Map<number, { received: number; forecasted: number }>()

    cashFlows.forEach(cf => {
      const year = new Date(cf.payment_date).getFullYear()
      const existing = byYear.get(year) || { received: 0, forecasted: 0 }
      if (cf.is_forecasted) {
        existing.forecasted += cf.amount
      } else {
        existing.received += cf.amount
      }
      byYear.set(year, existing)
    })

    // Add future forecast years based on recurring cash flows
    const currentYear = new Date().getFullYear()
    const recurringCFs = cashFlows.filter(cf => cf.is_recurring && !cf.is_forecasted)
    const annualRecurring = recurringCFs.reduce((sum, cf) => sum + cf.amount, 0)

    for (let y = currentYear + 1; y <= currentYear + 3; y++) {
      if (!byYear.has(y) && annualRecurring > 0) {
        byYear.set(y, { received: 0, forecasted: annualRecurring })
      }
    }

    const sorted = Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, data]) => ({
        year: year.toString(),
        ricevuti: data.received,
        previsti: data.forecasted,
        totale: data.received + data.forecasted,
      }))

    // Calculate YoY growth
    const historicalYears = sorted.filter(d => d.ricevuti > 0)
    let yoyGrowth = 0
    if (historicalYears.length >= 2) {
      const last = historicalYears[historicalYears.length - 1]!.ricevuti
      const prev = historicalYears[historicalYears.length - 2]!.ricevuti
      yoyGrowth = prev > 0 ? ((last - prev) / prev) * 100 : 0
    }

    // Calculate yield
    const totalReceived = cashFlows.filter(cf => !cf.is_forecasted).reduce((s, cf) => s + cf.amount, 0)
    const totalAssetValue = assets.reduce((s, a) => s + (a.current_value || 0), 0)
    const totalYield = totalAssetValue > 0 ? (totalReceived / totalAssetValue) * 100 : 0

    return { data: sorted, yoyGrowth, totalYield, totalReceived }
  }, [cashFlows, assets])

  const instrumentData = useMemo(() => {
    if (viewMode !== 'instrument' || cashFlows.length === 0) return []

    const byAsset = new Map<string, { name: string; received: number; forecasted: number }>()
    cashFlows.forEach(cf => {
      const asset = cf.asset_id ? assets.find(a => a.id === cf.asset_id) : null
      const key = cf.asset_id || 'portfolio'
      const name = asset ? asset.name : 'Portfolio'
      const existing = byAsset.get(key) || { name, received: 0, forecasted: 0 }
      if (cf.is_forecasted) {
        existing.forecasted += cf.amount
      } else {
        existing.received += cf.amount
      }
      byAsset.set(key, existing)
    })

    return Array.from(byAsset.values())
      .sort((a, b) => (b.received + b.forecasted) - (a.received + a.forecasted))
  }, [cashFlows, assets, viewMode])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cash Flow</h2>
          <p className="text-xs text-muted-foreground">Dividendi, cedole e rendite</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('cumulative')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === 'cumulative'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            Cumulativo
          </button>
          <button
            onClick={() => setViewMode('instrument')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === 'instrument'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            Per Strumento
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">Totale Ricevuto</p>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            €{(yearlyData.totalReceived || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">Crescita YoY</p>
          <p className={`text-sm font-bold ${yearlyData.yoyGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {yearlyData.yoyGrowth >= 0 ? '+' : ''}{yearlyData.yoyGrowth.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">Rendimento</p>
          <p className="text-sm font-bold text-foreground">{yearlyData.totalYield.toFixed(2)}%</p>
        </div>
      </div>

      {viewMode === 'cumulative' ? (
        yearlyData.data && yearlyData.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={yearlyData.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: number | undefined, name: string | undefined) => [
                  `€${(value ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
                  name === 'ricevuti' ? 'Ricevuti' : 'Previsti',
                ]}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-foreground">
                    {value === 'ricevuti' ? 'Ricevuti' : 'Previsti'}
                  </span>
                )}
              />
              <Bar dataKey="ricevuti" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="previsti" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nessun cash flow registrato
          </p>
        )
      ) : (
        instrumentData.length > 0 ? (
          <div className="space-y-2">
            {instrumentData.map(item => {
              const total = item.received + item.forecasted
              return (
                <div key={item.name} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-secondary/50">
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      €{item.received.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                    {item.forecasted > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">
                        +€{item.forecasted.toLocaleString('it-IT', { minimumFractionDigits: 2 })} prev.
                      </span>
                    )}
                    <span className="font-medium text-foreground">
                      €{total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nessun cash flow registrato
          </p>
        )
      )}
    </div>
  )
}
