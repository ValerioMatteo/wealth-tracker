import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { Asset, AssetType, AllocationBreakdown } from '@/types'

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Azioni',
  bond: 'Obbligazioni',
  etf: 'ETF',
  crypto: 'Crypto',
  real_estate: 'Immobili',
  luxury: 'Luxury',
  commodity: 'Commodity',
  cash: 'Liquidita',
}

const COLORS = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#f97316', '#10b981',
  '#ec4899', '#eab308', '#64748b', '#06b6d4', '#84cc16',
  '#e11d48', '#7c3aed',
]

const BREAKDOWN_LABELS: Record<AllocationBreakdown, string> = {
  type: 'Tipo Asset',
  sector: 'Settore',
  country: 'Paese',
}

interface AllocationChartsProps {
  assets: Asset[]
}

export function AllocationCharts({ assets }: AllocationChartsProps) {
  const [breakdown, setBreakdown] = useState<AllocationBreakdown>('type')

  const data = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + (a.current_value || 0), 0)
    if (totalValue === 0) return []

    const map = new Map<string, { name: string; value: number; count: number }>()

    assets.forEach(a => {
      let key: string
      let name: string

      switch (breakdown) {
        case 'type':
          key = a.asset_type
          name = ASSET_TYPE_LABELS[a.asset_type] || a.asset_type
          break
        case 'sector':
          key = (a.metadata?.sector as string) || 'Non specificato'
          name = key
          break
        case 'country':
          key = (a.metadata?.country as string) || 'Non specificato'
          name = key
          break
        default:
          key = a.asset_type
          name = ASSET_TYPE_LABELS[a.asset_type] || a.asset_type
      }

      const existing = map.get(key) || { name, value: 0, count: 0 }
      map.set(key, {
        name,
        value: existing.value + (a.current_value || 0),
        count: existing.count + 1,
      })
    })

    return Array.from(map.values())
      .map(d => ({
        ...d,
        percentage: (d.value / totalValue) * 100,
      }))
      .sort((a, b) => b.value - a.value)
  }, [assets, breakdown])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Composizione Portafoglio</h2>
        <div className="flex gap-1">
          {(Object.keys(BREAKDOWN_LABELS) as AllocationBreakdown[]).map(b => (
            <button
              key={b}
              onClick={() => setBreakdown(b)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                breakdown === b
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {BREAKDOWN_LABELS[b]}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nessun dato disponibile</p>
      ) : (
        <div className="flex flex-col items-center gap-4 lg:flex-row">
          <div className="w-full lg:w-1/2">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((_entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  formatter={(value: number | undefined) => [
                    `€${(value ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconSize={10}
                  formatter={(value) => (
                    <span className="text-xs text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full space-y-2 lg:w-1/2">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-sm text-foreground">{d.name}</span>
                  <span className="text-xs text-muted-foreground">({d.count})</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-foreground">
                    €{d.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {d.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
