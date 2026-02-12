import { useEffect, useMemo } from 'react'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  CreditCard,
} from 'lucide-react'
import type { AssetType } from '@/types'

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Azioni',
  bond: 'Obbligazioni',
  etf: 'ETF',
  crypto: 'Crypto',
  real_estate: 'Immobili',
  luxury: 'Luxury',
  commodity: 'Commodity',
  cash: 'Liquidità',
}

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  stock: 'bg-blue-500',
  bond: 'bg-amber-500',
  etf: 'bg-violet-500',
  crypto: 'bg-orange-500',
  real_estate: 'bg-emerald-500',
  luxury: 'bg-pink-500',
  commodity: 'bg-yellow-500',
  cash: 'bg-slate-500',
}

export function DashboardPage() {
  const {
    currentPortfolio,
    portfolios,
    assets,
    debts,
    isLoading,
    fetchPortfolios,
    fetchDebts,
  } = usePortfolioStore()

  useEffect(() => {
    fetchPortfolios()
    fetchDebts()
  }, [fetchPortfolios, fetchDebts])

  const stats = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + (a.current_value || 0), 0)
    const totalCost = assets.reduce((sum, a) => sum + a.purchase_price * a.quantity, 0)
    const totalGain = totalValue - totalCost
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0
    const totalDebt = debts.reduce((sum, d) => sum + d.remaining_balance, 0)
    const netWorth = totalValue - totalDebt

    // Asset allocation
    const allocationMap = new Map<AssetType, { value: number; count: number }>()
    assets.forEach(a => {
      const existing = allocationMap.get(a.asset_type) || { value: 0, count: 0 }
      allocationMap.set(a.asset_type, {
        value: existing.value + (a.current_value || 0),
        count: existing.count + 1,
      })
    })
    const allocation = Array.from(allocationMap.entries())
      .map(([type, data]) => ({
        type,
        value: data.value,
        count: data.count,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)

    // Top performers and worst performers
    const assetsWithGain = assets
      .filter(a => a.purchase_price > 0 && a.quantity > 0)
      .map(a => ({
        ...a,
        gain: (a.current_value || 0) - a.purchase_price * a.quantity,
        gainPercent: ((a.current_value || 0) - a.purchase_price * a.quantity) / (a.purchase_price * a.quantity) * 100,
      }))
      .sort((a, b) => b.gainPercent - a.gainPercent)

    const topPerformers = assetsWithGain.slice(0, 5)
    const worstPerformers = [...assetsWithGain].sort((a, b) => a.gainPercent - b.gainPercent).slice(0, 5)

    return { totalValue, totalCost, totalGain, totalGainPercent, totalDebt, netWorth, allocation, topPerformers, worstPerformers }
  }, [assets, debts])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-primary"></div>
          <p className="mt-4 text-muted-foreground">Caricamento portfolio...</p>
        </div>
      </div>
    )
  }

  if (!currentPortfolio) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Benvenuto in WealthTracker</h2>
          <p className="mt-2 text-muted-foreground">Crea il tuo primo portfolio per iniziare</p>
          <Link
            to="/portfolios"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Crea Portfolio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {currentPortfolio.name} - {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Patrimonio Netto</p>
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            €{stats.netWorth.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Valore Portfolio</p>
            <PieChart className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            €{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{assets.length} asset</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Guadagno/Perdita</p>
            {stats.totalGain >= 0
              ? <TrendingUp className="h-5 w-5 text-emerald-400" />
              : <TrendingDown className="h-5 w-5 text-red-400" />
            }
          </div>
          <p className={`mt-2 text-2xl font-bold ${stats.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalGain >= 0 ? '+' : ''}€{stats.totalGain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className={`mt-1 text-xs ${stats.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalGain >= 0 ? '+' : ''}{stats.totalGainPercent.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Debiti Totali</p>
            <CreditCard className="h-5 w-5 text-red-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-400">
            €{stats.totalDebt.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{debts.length} debiti</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Asset Allocation */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Asset Allocation</h2>
          {stats.allocation.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nessun asset nel portfolio</p>
          ) : (
            <div className="space-y-3">
              {/* Visual bar */}
              <div className="flex h-4 overflow-hidden rounded-full">
                {stats.allocation.map(a => (
                  <div
                    key={a.type}
                    className={`${ASSET_TYPE_COLORS[a.type]} transition-all`}
                    style={{ width: `${a.percentage}%` }}
                  />
                ))}
              </div>
              {/* Legend */}
              <div className="space-y-2">
                {stats.allocation.map(a => (
                  <div key={a.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${ASSET_TYPE_COLORS[a.type]}`} />
                      <span className="text-sm text-foreground">{ASSET_TYPE_LABELS[a.type]}</span>
                      <span className="text-xs text-muted-foreground">({a.count})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-foreground">
                        €{a.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">{a.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Performers */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Top Performers</h2>
          {stats.topPerformers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nessun asset nel portfolio</p>
          ) : (
            <div className="space-y-2">
              {stats.topPerformers.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.gain >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {a.gain >= 0
                        ? <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                        : <ArrowDownRight className="h-4 w-4 text-red-400" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.symbol || ASSET_TYPE_LABELS[a.asset_type]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">€{(a.current_value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    <p className={`text-xs ${a.gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {a.gain >= 0 ? '+' : ''}{a.gainPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Worst Performers */}
      {stats.worstPerformers.length > 0 && stats.worstPerformers.some(a => a.gain < 0) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Worst Performers</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {stats.worstPerformers
              .filter(a => a.gain < 0)
              .map(a => (
                <div key={a.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.symbol || a.asset_type}</p>
                  <p className="mt-1 text-sm font-medium text-red-400">{a.gainPercent.toFixed(2)}%</p>
                  <p className="text-xs text-red-400">€{a.gain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* All Assets List */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Tutti gli Asset ({assets.length})</h2>
          <Link
            to="/assets"
            className="text-sm text-primary transition-colors hover:text-primary/80"
          >
            Gestisci
          </Link>
        </div>
        {assets.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Nessun asset nel portfolio</p>
            <Link
              to="/assets"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
            >
              <Plus className="h-3 w-3" /> Aggiungi asset
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map(asset => {
              const gain = (asset.current_value || 0) - asset.purchase_price * asset.quantity
              const gainPercent = asset.purchase_price * asset.quantity > 0
                ? (gain / (asset.purchase_price * asset.quantity)) * 100
                : 0

              return (
                <div
                  key={asset.id}
                  className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${ASSET_TYPE_COLORS[asset.asset_type]}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.symbol} - Qtà: {asset.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">€{(asset.current_value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    <p className={`text-xs ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {gain >= 0 ? '+' : ''}€{gain.toLocaleString('it-IT', { minimumFractionDigits: 2 })} ({gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
