import { useEffect, useMemo, useState } from 'react'
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
  BarChart3,
  LineChart,
  ListFilter,
} from 'lucide-react'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { AllocationCharts } from '@/components/dashboard/AllocationCharts'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics'
import type { AssetType } from '@/types'

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

type DashboardSection = 'overview' | 'allocation' | 'cashflow' | 'performance'

export function DashboardPage() {
  const {
    portfolios,
    allAssets,
    allCashFlows,
    allTransactions,
    debts,
    taxEvents,
    isLoading,
    fetchPortfolios,
    fetchAllAssets,
    fetchAllCashFlows,
    fetchAllTransactions,
    fetchDebts,
    fetchTaxEvents,
  } = usePortfolioStore()

  const [activeSection, setActiveSection] = useState<DashboardSection>('overview')

  useEffect(() => {
    fetchPortfolios()
    fetchDebts()
    fetchTaxEvents()
  }, [fetchPortfolios, fetchDebts, fetchTaxEvents])

  useEffect(() => {
    if (portfolios.length > 0) {
      fetchAllAssets()
      fetchAllCashFlows()
    }
  }, [portfolios, fetchAllAssets, fetchAllCashFlows])

  useEffect(() => {
    if (allAssets.length > 0) {
      fetchAllTransactions()
    }
  }, [allAssets, fetchAllTransactions])

  const stats = useMemo(() => {
    const totalValue = allAssets.reduce((sum, a) => sum + (a.current_value || 0), 0)
    const totalCost = allAssets.reduce((sum, a) => sum + a.purchase_price * a.quantity, 0)
    const totalGain = totalValue - totalCost
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0
    const totalDebt = debts.reduce((sum, d) => sum + d.remaining_balance, 0)
    const netWorth = totalValue - totalDebt

    const assetsWithGain = allAssets
      .filter(a => a.purchase_price > 0 && a.quantity > 0)
      .map(a => ({
        ...a,
        gain: (a.current_value || 0) - a.purchase_price * a.quantity,
        gainPercent: ((a.current_value || 0) - a.purchase_price * a.quantity) / (a.purchase_price * a.quantity) * 100,
      }))
      .sort((a, b) => b.gainPercent - a.gainPercent)

    const topPerformers = assetsWithGain.slice(0, 5)
    const worstPerformers = [...assetsWithGain].sort((a, b) => a.gainPercent - b.gainPercent).slice(0, 5)

    return { totalValue, totalCost, totalGain, totalGainPercent, totalDebt, netWorth, topPerformers, worstPerformers }
  }, [allAssets, debts])

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

  if (portfolios.length === 0) {
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

  const sections: { key: DashboardSection; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Panoramica', icon: <LineChart className="h-4 w-4" /> },
    { key: 'allocation', label: 'Composizione', icon: <PieChart className="h-4 w-4" /> },
    { key: 'cashflow', label: 'Cash Flow', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'performance', label: 'Performance', icon: <ListFilter className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Aggregazione di {portfolios.length} portfolio - {allAssets.length} asset totali
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
            <p className="text-sm text-muted-foreground">Capitale Investito</p>
            <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            €{stats.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Valore: €{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Guadagno/Perdita</p>
            {stats.totalGain >= 0
              ? <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              : <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            }
          </div>
          <p className={`mt-2 text-2xl font-bold ${stats.totalGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {stats.totalGain >= 0 ? '+' : ''}€{stats.totalGain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className={`mt-1 text-xs ${stats.totalGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {stats.totalGain >= 0 ? '+' : ''}{stats.totalGainPercent.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Debiti Totali</p>
            <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            €{stats.totalDebt.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{debts.length} debiti</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === s.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Performance chart */}
          <PerformanceChart
            assets={allAssets}
            totalValue={stats.totalValue}
            totalCost={stats.totalCost}
          />

          {/* Top/Worst Performers */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Top Performers</h2>
              {stats.topPerformers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nessun asset</p>
              ) : (
                <div className="space-y-2">
                  {stats.topPerformers.map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.gain >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
                          {a.gain >= 0
                            ? <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            : <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.symbol || ASSET_TYPE_LABELS[a.asset_type]}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">€{(a.current_value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                        <p className={`text-xs ${a.gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {a.gain >= 0 ? '+' : ''}{a.gainPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Worst Performers</h2>
              {stats.worstPerformers.filter(a => a.gain < 0).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nessuna perdita</p>
              ) : (
                <div className="space-y-2">
                  {stats.worstPerformers.filter(a => a.gain < 0).map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
                          <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.symbol || ASSET_TYPE_LABELS[a.asset_type]}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">€{(a.current_value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-red-600 dark:text-red-400">{a.gainPercent.toFixed(2)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All positions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Tutte le Posizioni ({allAssets.length})</h2>
            </div>
            {allAssets.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Nessun asset nei portfolio</p>
                <Link
                  to="/portfolios"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
                >
                  <Plus className="h-3 w-3" /> Aggiungi asset
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {allAssets.map(asset => {
                  const gain = (asset.current_value || 0) - asset.purchase_price * asset.quantity
                  const gainPercent = asset.purchase_price * asset.quantity > 0
                    ? (gain / (asset.purchase_price * asset.quantity)) * 100
                    : 0
                  const portfolioName = portfolios.find(p => p.id === asset.portfolio_id)?.name || ''
                  const allocPercent = stats.totalValue > 0 ? ((asset.current_value || 0) / stats.totalValue) * 100 : 0

                  return (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${ASSET_TYPE_COLORS[asset.asset_type]}`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {asset.symbol && <span className="mr-1 font-mono">{asset.symbol}</span>}
                            <span className="rounded bg-secondary px-1 py-0.5 text-[10px]">{ASSET_TYPE_LABELS[asset.asset_type]}</span>
                            {portfolioName && <span className="ml-1 text-[10px]">- {portfolioName}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">€{(asset.current_value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                          <p className={`text-xs ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {gain >= 0 ? '+' : ''}€{gain.toLocaleString('it-IT', { minimumFractionDigits: 2 })} ({gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)
                          </p>
                        </div>
                        <div className="hidden text-right text-xs text-muted-foreground sm:block">
                          <p>{allocPercent.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'allocation' && (
        <AllocationCharts assets={allAssets} />
      )}

      {activeSection === 'cashflow' && (
        <CashFlowChart cashFlows={allCashFlows} assets={allAssets} />
      )}

      {activeSection === 'performance' && (
        <PerformanceMetrics
          assets={allAssets}
          transactions={allTransactions}
          cashFlows={allCashFlows}
          taxEvents={taxEvents}
        />
      )}
    </div>
  )
}
