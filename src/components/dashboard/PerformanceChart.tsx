import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Asset, TimeRange } from '@/types'

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1D', label: '1G' },
  { value: '1W', label: '1S' },
  { value: '1M', label: '1M' },
  { value: 'YTD', label: 'YTD' },
  { value: '1Y', label: '1A' },
  { value: 'MAX', label: 'MAX' },
]

interface PerformanceChartProps {
  assets: Asset[]
  totalValue: number
  totalCost: number
}

function generateHistoricalData(
  _assets: Asset[],
  totalValue: number,
  totalCost: number,
  range: TimeRange
) {
  const now = new Date()
  let days: number
  switch (range) {
    case '1D': days = 1; break
    case '1W': days = 7; break
    case '1M': days = 30; break
    case 'YTD': {
      const start = new Date(now.getFullYear(), 0, 1)
      days = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      break
    }
    case '1Y': days = 365; break
    case 'MAX': days = 730; break
    default: days = 30
  }

  const points = Math.min(days, 100)
  const data: { date: string; value: number }[] = []
  const startValue = totalCost > 0 ? totalCost : totalValue * 0.9
  const diff = totalValue - startValue

  for (let i = 0; i <= points; i++) {
    const progress = i / points
    const date = new Date(now.getTime() - (points - i) * (days / points) * 24 * 60 * 60 * 1000)
    // Smooth curve with some noise
    const noise = (Math.sin(i * 0.5) * 0.02 + Math.cos(i * 0.3) * 0.015) * totalValue
    const value = startValue + diff * progress + noise

    const format = days <= 1
      ? date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })

    data.push({ date: format, value: Math.max(0, value) })
  }

  return data
}

export function PerformanceChart({ assets, totalValue, totalCost }: PerformanceChartProps) {
  const [range, setRange] = useState<TimeRange>('1M')

  const data = useMemo(
    () => generateHistoricalData(assets, totalValue, totalCost, range),
    [assets, totalValue, totalCost, range]
  )

  const isPositive = totalValue >= totalCost
  const color = isPositive ? '#10b981' : '#ef4444'

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Andamento Patrimonio</h2>
        <div className="flex gap-1">
          {TIME_RANGES.map(tr => (
            <button
              key={tr.value}
              onClick={() => setRange(tr.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                range === tr.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(value: number | undefined) => [
              `€${(value ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
              'Valore',
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#chartGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
