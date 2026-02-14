import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Receipt,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Layers,
} from 'lucide-react'
import { AssetFormFields } from '@/components/portfolio/AssetFormFields'
import type { AssetFormState } from '@/components/portfolio/AssetFormFields'
import type { AssetType, TransactionType, CashFlowType, DebtType, Currency } from '@/types'

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Azioni', bond: 'Obbligazioni', etf: 'ETF', crypto: 'Crypto',
  real_estate: 'Immobili', luxury: 'Luxury', commodity: 'Commodity', cash: 'Liquidita',
}

const TX_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'buy', label: 'Acquisto' }, { value: 'sell', label: 'Vendita' },
  { value: 'dividend', label: 'Dividendo' }, { value: 'coupon', label: 'Cedola' },
  { value: 'split', label: 'Split' }, { value: 'deposit', label: 'Deposito' },
  { value: 'withdrawal', label: 'Prelievo' },
]

const FLOW_TYPES: { value: CashFlowType; label: string }[] = [
  { value: 'dividend', label: 'Dividendo' }, { value: 'coupon', label: 'Cedola' },
  { value: 'rent', label: 'Affitto' }, { value: 'interest', label: 'Interesse' },
  { value: 'other', label: 'Altro' },
]

const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: 'mortgage', label: 'Mutuo' }, { value: 'loan', label: 'Prestito' },
  { value: 'credit_card', label: 'Carta di credito' }, { value: 'line_of_credit', label: 'Fido bancario' },
]

const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF', 'JPY']

type PortfolioTab = 'overview' | 'assets' | 'transactions' | 'cashflows' | 'debts'

const emptyAssetForm: AssetFormState = {
  asset_type: 'stock', symbol: '', name: '', quantity: 0,
  purchase_price: 0, purchase_date: new Date().toISOString().slice(0, 10),
  current_price: 0, metadata: {},
}

export function PortfolioDetailPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>()
  const navigate = useNavigate()
  const {
    portfolios, assets, transactions, cashFlows, debts, isLoading,
    fetchPortfolios, fetchAssets, fetchTransactions, fetchCashFlows, fetchDebts,
    setCurrentPortfolio,
    createAsset, updateAsset, deleteAsset,
    createTransaction, deleteTransaction,
    createCashFlow, updateCashFlow, deleteCashFlow,
    createDebt, updateDebt, deleteDebt,
  } = usePortfolioStore()

  const [activeTab, setActiveTab] = useState<PortfolioTab>('overview')

  // Asset form
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [assetForm, setAssetForm] = useState<AssetFormState>(emptyAssetForm)
  const [assetSearch, setAssetSearch] = useState('')
  const [assetFilter, setAssetFilter] = useState<AssetType | ''>('')

  // Transaction form
  const [showTxForm, setShowTxForm] = useState(false)
  const [txForm, setTxForm] = useState({ asset_id: '', transaction_type: 'buy' as TransactionType, quantity: 0, price: 0, fees: 0, transaction_date: new Date().toISOString().slice(0, 10), notes: '' })

  // Cash flow form
  const [showCFForm, setShowCFForm] = useState(false)
  const [editingCFId, setEditingCFId] = useState<string | null>(null)
  const [cfForm, setCFForm] = useState({ flow_type: 'dividend' as CashFlowType, amount: 0, payment_date: new Date().toISOString().slice(0, 10), is_forecasted: false, is_recurring: false, notes: '', asset_id: '' })

  // Debt form
  const [showDebtForm, setShowDebtForm] = useState(false)
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null)
  const [debtForm, setDebtForm] = useState({ debt_type: 'mortgage' as DebtType, lender: '', principal_amount: 0, interest_rate: 0, remaining_balance: 0, monthly_payment: 0, start_date: new Date().toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10), currency: 'EUR' as Currency })

  const [saving, setSaving] = useState(false)

  const portfolio = useMemo(
    () => portfolios.find(p => p.id === portfolioId) || null,
    [portfolios, portfolioId]
  )

  useEffect(() => {
    fetchPortfolios()
    fetchDebts()
  }, [fetchPortfolios, fetchDebts])

  useEffect(() => {
    if (portfolio) {
      setCurrentPortfolio(portfolio)
      fetchAssets(portfolio.id)
      fetchCashFlows(portfolio.id)
    }
  }, [portfolio, setCurrentPortfolio, fetchAssets, fetchCashFlows])

  useEffect(() => {
    if (assets.length > 0) fetchTransactions()
  }, [assets, fetchTransactions])

  const stats = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + (a.current_value || 0), 0)
    const totalCost = assets.reduce((sum, a) => sum + a.purchase_price * a.quantity, 0)
    const gain = totalValue - totalCost
    const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0
    return { totalValue, totalCost, gain, gainPercent }
  }, [assets])

  if (isLoading && !portfolio) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold text-foreground">Portfolio non trovato</h2>
        <button onClick={() => navigate('/portfolios')} className="mt-4 text-sm text-primary hover:text-primary/80">
          Torna ai Portfolios
        </button>
      </div>
    )
  }

  const tabs: { key: PortfolioTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Panoramica', icon: <Layers className="h-4 w-4" /> },
    { key: 'assets', label: `Asset (${assets.length})`, icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'transactions', label: `Transazioni (${transactions.length})`, icon: <Receipt className="h-4 w-4" /> },
    { key: 'cashflows', label: `Cash Flow (${cashFlows.length})`, icon: <DollarSign className="h-4 w-4" /> },
    { key: 'debts', label: `Debiti (${debts.length})`, icon: <CreditCard className="h-4 w-4" /> },
  ]

  const filteredAssets = assets.filter(a => {
    const matchSearch = !assetSearch || a.name.toLowerCase().includes(assetSearch.toLowerCase()) || (a.symbol?.toLowerCase().includes(assetSearch.toLowerCase()))
    const matchType = !assetFilter || a.asset_type === assetFilter
    return matchSearch && matchType
  })

  // --- Handlers ---
  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetForm.name.trim()) return
    setSaving(true)
    const data = { ...assetForm, current_value: assetForm.asset_type === 'cash' ? assetForm.purchase_price : assetForm.quantity * assetForm.current_price }
    if (editingAssetId) { await updateAsset(editingAssetId, data) } else { await createAsset(data) }
    setSaving(false); setShowAssetForm(false); setEditingAssetId(null); setAssetForm(emptyAssetForm)
  }

  const handleEditAsset = (a: typeof assets[0]) => {
    setAssetForm({
      asset_type: a.asset_type, symbol: a.symbol || '', name: a.name,
      quantity: a.quantity, purchase_price: a.purchase_price,
      purchase_date: a.purchase_date, current_price: a.current_price,
      metadata: a.metadata || {},
    })
    setEditingAssetId(a.id); setShowAssetForm(true)
  }

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txForm.asset_id) return
    setSaving(true); await createTransaction(txForm)
    setSaving(false); setShowTxForm(false); setTxForm({ asset_id: '', transaction_type: 'buy', quantity: 0, price: 0, fees: 0, transaction_date: new Date().toISOString().slice(0, 10), notes: '' })
  }

  const handleCFSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (editingCFId) { await updateCashFlow(editingCFId, cfForm) } else { await createCashFlow(cfForm) }
    setSaving(false); setShowCFForm(false); setEditingCFId(null)
    setCFForm({ flow_type: 'dividend', amount: 0, payment_date: new Date().toISOString().slice(0, 10), is_forecasted: false, is_recurring: false, notes: '', asset_id: '' })
  }

  const handleDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!debtForm.lender.trim()) return
    setSaving(true)
    if (editingDebtId) { await updateDebt(editingDebtId, debtForm) } else { await createDebt(debtForm) }
    setSaving(false); setShowDebtForm(false); setEditingDebtId(null)
    setDebtForm({ debt_type: 'mortgage', lender: '', principal_amount: 0, interest_rate: 0, remaining_balance: 0, monthly_payment: 0, start_date: new Date().toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10), currency: 'EUR' })
  }

  const getAssetName = (id: string | null) => id ? (assets.find(a => a.id === id)?.name || '-') : '-'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/portfolios')} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{portfolio.name}</h1>
          {portfolio.description && <p className="text-sm text-muted-foreground">{portfolio.description}</p>}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Valore</p>
          <p className="mt-1 text-xl font-bold text-foreground">€{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Costo</p>
          <p className="mt-1 text-xl font-bold text-foreground">€{stats.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Gain/Loss</p>
          <p className={`mt-1 text-xl font-bold ${stats.gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {stats.gain >= 0 ? '+' : ''}€{stats.gain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Rendimento</p>
          <p className={`mt-1 text-xl font-bold ${stats.gainPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {stats.gainPercent >= 0 ? '+' : ''}{stats.gainPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {assets.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-foreground font-medium">Nessun asset</p>
              <p className="text-sm text-muted-foreground">Aggiungi il primo asset a questo portfolio</p>
              <button onClick={() => { setActiveTab('assets'); setShowAssetForm(true) }}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                <Plus className="h-3 w-3" /> Aggiungi Asset
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map(a => {
                const g = (a.current_value || 0) - a.purchase_price * a.quantity
                const gp = a.purchase_price * a.quantity > 0 ? (g / (a.purchase_price * a.quantity)) * 100 : 0
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${g >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
                        {g >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.symbol || ASSET_TYPE_LABELS[a.asset_type]}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">€{(a.current_value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                      <p className={`text-xs ${g >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {g >= 0 ? '+' : ''}{gp.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== ASSETS TAB ===== */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={assetSearch} onChange={e => setAssetSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" placeholder="Cerca..." />
              </div>
              <select value={assetFilter} onChange={e => setAssetFilter(e.target.value as AssetType | '')}
                className="rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none">
                <option value="">Tutti</option>
                {Object.entries(ASSET_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <button onClick={() => { setAssetForm(emptyAssetForm); setEditingAssetId(null); setShowAssetForm(true) }}
              className="ml-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Aggiungi
            </button>
          </div>

          {showAssetForm && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{editingAssetId ? 'Modifica Asset' : 'Nuovo Asset'}</h2>
                <button onClick={() => { setShowAssetForm(false); setEditingAssetId(null) }} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleAssetSubmit} className="space-y-4">
                <AssetFormFields form={assetForm} onChange={setAssetForm} />
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {saving ? 'Salvataggio...' : editingAssetId ? 'Aggiorna' : 'Aggiungi'}
                  </button>
                  <button type="button" onClick={() => { setShowAssetForm(false); setEditingAssetId(null) }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Annulla</button>
                </div>
              </form>
            </div>
          )}

          {filteredAssets.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-foreground font-medium">Nessun Asset</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map(a => {
                const g = (a.current_value || 0) - a.purchase_price * a.quantity
                const gp = a.purchase_price * a.quantity > 0 ? (g / (a.purchase_price * a.quantity)) * 100 : 0
                return (
                  <div key={a.id} className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-secondary/50">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${g >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
                        {g >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{a.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {a.symbol && <span className="mr-2 font-mono">{a.symbol}</span>}
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">{ASSET_TYPE_LABELS[a.asset_type]}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-medium text-foreground">€{(a.current_value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                        <p className={`text-sm ${g >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {g >= 0 ? '+' : ''}€{g.toLocaleString('it-IT', { minimumFractionDigits: 2 })} ({g >= 0 ? '+' : ''}{gp.toFixed(2)}%)
                        </p>
                      </div>
                      {a.asset_type !== 'cash' && a.asset_type !== 'real_estate' && (
                        <div className="text-right text-sm text-muted-foreground">
                          <p>Qta: {a.quantity}</p>
                          <p>PMC: €{a.purchase_price.toFixed(2)}</p>
                        </div>
                      )}
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => handleEditAsset(a)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => { if (confirm('Eliminare questo asset?')) deleteAsset(a.id) }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== TRANSACTIONS TAB ===== */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setTxForm({ asset_id: assets[0]?.id || '', transaction_type: 'buy', quantity: 0, price: 0, fees: 0, transaction_date: new Date().toISOString().slice(0, 10), notes: '' }); setShowTxForm(true) }}
              disabled={assets.length === 0}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Nuova Transazione
            </button>
          </div>

          {showTxForm && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Nuova Transazione</h2>
                <button onClick={() => setShowTxForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleTxSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Asset *</label>
                    <select value={txForm.asset_id} onChange={e => setTxForm({ ...txForm, asset_id: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" required>
                      <option value="">Seleziona</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name} {a.symbol ? `(${a.symbol})` : ''}</option>)}
                    </select></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Tipo *</label>
                    <select value={txForm.transaction_type} onChange={e => setTxForm({ ...txForm, transaction_type: e.target.value as TransactionType })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none">
                      {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Quantita</label>
                    <input type="number" step="any" value={txForm.quantity || ''} onChange={e => setTxForm({ ...txForm, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Prezzo (€)</label>
                    <input type="number" step="any" value={txForm.price || ''} onChange={e => setTxForm({ ...txForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Commissioni</label>
                    <input type="number" step="any" value={txForm.fees || ''} onChange={e => setTxForm({ ...txForm, fees: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Data</label>
                    <input type="date" value={txForm.transaction_date} onChange={e => setTxForm({ ...txForm, transaction_date: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                </div>
                {txForm.quantity > 0 && txForm.price > 0 && (
                  <p className="text-sm text-muted-foreground">Totale: €{(txForm.quantity * txForm.price + txForm.fees).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                )}
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {saving ? 'Salvataggio...' : 'Registra'}</button>
                  <button type="button" onClick={() => setShowTxForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Annulla</button>
                </div>
              </form>
            </div>
          )}

          {transactions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">Nessuna Transazione</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Asset</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Qta</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Prezzo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Totale</th>
                  <th className="px-4 py-3"></th>
                </tr></thead>
                <tbody>
                  {transactions.map(tx => {
                    const isBuy = tx.transaction_type === 'buy' || tx.transaction_type === 'deposit'
                    return (
                      <tr key={tx.id} className="border-b border-border hover:bg-secondary/30">
                        <td className="px-4 py-3 text-sm text-foreground">{new Date(tx.transaction_date).toLocaleDateString('it-IT')}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{getAssetName(tx.asset_id)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${isBuy ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                            {isBuy ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            {TX_TYPES.find(t => t.value === tx.transaction_type)?.label || tx.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">{tx.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">€{tx.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-foreground">€{tx.total_amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { if (confirm('Eliminare?')) deleteTransaction(tx.id) }}
                            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== CASH FLOWS TAB ===== */}
      {activeTab === 'cashflows' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-secondary/50 px-3 py-2">
                <span className="text-muted-foreground">Ricevuti: </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">€{cashFlows.filter(cf => !cf.is_forecasted).reduce((s, cf) => s + cf.amount, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="rounded-lg bg-secondary/50 px-3 py-2">
                <span className="text-muted-foreground">Previsti: </span>
                <span className="font-medium text-blue-600 dark:text-blue-400">€{cashFlows.filter(cf => cf.is_forecasted).reduce((s, cf) => s + cf.amount, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <button onClick={() => { setCFForm({ flow_type: 'dividend', amount: 0, payment_date: new Date().toISOString().slice(0, 10), is_forecasted: false, is_recurring: false, notes: '', asset_id: '' }); setEditingCFId(null); setShowCFForm(true) }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Nuovo
            </button>
          </div>

          {showCFForm && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{editingCFId ? 'Modifica' : 'Nuovo'} Cash Flow</h2>
                <button onClick={() => { setShowCFForm(false); setEditingCFId(null) }} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCFSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Tipo *</label>
                    <select value={cfForm.flow_type} onChange={e => setCFForm({ ...cfForm, flow_type: e.target.value as CashFlowType })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none">
                      {FLOW_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Importo (€) *</label>
                    <input type="number" step="any" value={cfForm.amount || ''} onChange={e => setCFForm({ ...cfForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" required /></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Data</label>
                    <input type="date" value={cfForm.payment_date} onChange={e => setCFForm({ ...cfForm, payment_date: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Asset</label>
                    <select value={cfForm.asset_id} onChange={e => setCFForm({ ...cfForm, asset_id: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none">
                      <option value="">Nessun asset</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Note</label>
                    <input type="text" value={cfForm.notes} onChange={e => setCFForm({ ...cfForm, notes: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" /></div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={cfForm.is_forecasted} onChange={e => setCFForm({ ...cfForm, is_forecasted: e.target.checked })} className="h-4 w-4 rounded border-border accent-primary" />
                    Previsto
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={cfForm.is_recurring} onChange={e => setCFForm({ ...cfForm, is_recurring: e.target.checked })} className="h-4 w-4 rounded border-border accent-primary" />
                    Ricorrente
                  </label>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {saving ? 'Salvataggio...' : editingCFId ? 'Aggiorna' : 'Aggiungi'}</button>
                  <button type="button" onClick={() => { setShowCFForm(false); setEditingCFId(null) }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Annulla</button>
                </div>
              </form>
            </div>
          )}

          {cashFlows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <DollarSign className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">Nessun Cash Flow</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cashFlows.map(cf => (
                <div key={cf.id} className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-secondary/50">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cf.is_forecasted ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
                      {cf.is_recurring ? <RefreshCw className={`h-5 w-5 ${cf.is_forecasted ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`} /> : <DollarSign className={`h-5 w-5 ${cf.is_forecasted ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`} />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{FLOW_TYPES.find(f => f.value === cf.flow_type)?.label || cf.flow_type}</p>
                      <p className="text-sm text-muted-foreground">{getAssetName(cf.asset_id)} - {new Date(cf.payment_date).toLocaleDateString('it-IT')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-medium ${cf.is_forecasted ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>€{cf.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {cf.is_forecasted && <span className="rounded bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 text-blue-600 dark:text-blue-400">Previsto</span>}
                        {cf.is_recurring && <span className="rounded bg-secondary px-1.5 py-0.5">Ricorrente</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => { setCFForm({ flow_type: cf.flow_type, amount: cf.amount, payment_date: cf.payment_date, is_forecasted: cf.is_forecasted, is_recurring: cf.is_recurring, notes: cf.notes || '', asset_id: cf.asset_id || '' }); setEditingCFId(cf.id); setShowCFForm(true) }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm('Eliminare?')) deleteCashFlow(cf.id) }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DEBTS TAB ===== */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setDebtForm({ debt_type: 'mortgage', lender: '', principal_amount: 0, interest_rate: 0, remaining_balance: 0, monthly_payment: 0, start_date: new Date().toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10), currency: 'EUR' }); setEditingDebtId(null); setShowDebtForm(true) }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Nuovo Debito
            </button>
          </div>

          {showDebtForm && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{editingDebtId ? 'Modifica' : 'Nuovo'} Debito</h2>
                <button onClick={() => { setShowDebtForm(false); setEditingDebtId(null) }} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleDebtSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Tipo *</label>
                    <select value={debtForm.debt_type} onChange={e => setDebtForm({ ...debtForm, debt_type: e.target.value as DebtType })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none">
                      {DEBT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Creditore *</label>
                    <input type="text" value={debtForm.lender} onChange={e => setDebtForm({ ...debtForm, lender: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" placeholder="Es. Banca Intesa" required /></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Valuta</label>
                    <select value={debtForm.currency} onChange={e => setDebtForm({ ...debtForm, currency: e.target.value as Currency })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Capitale (€)</label>
                    <input type="number" step="any" value={debtForm.principal_amount || ''} onChange={e => setDebtForm({ ...debtForm, principal_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Residuo (€)</label>
                    <input type="number" step="any" value={debtForm.remaining_balance || ''} onChange={e => setDebtForm({ ...debtForm, remaining_balance: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Tasso (%)</label>
                    <input type="number" step="any" value={debtForm.interest_rate || ''} onChange={e => setDebtForm({ ...debtForm, interest_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Rata (€/mese)</label>
                    <input type="number" step="any" value={debtForm.monthly_payment || ''} onChange={e => setDebtForm({ ...debtForm, monthly_payment: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Data Inizio</label>
                    <input type="date" value={debtForm.start_date} onChange={e => setDebtForm({ ...debtForm, start_date: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                  <div><label className="mb-1 block text-sm font-medium text-foreground">Data Fine</label>
                    <input type="date" value={debtForm.end_date} onChange={e => setDebtForm({ ...debtForm, end_date: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none" /></div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {saving ? 'Salvataggio...' : editingDebtId ? 'Aggiorna' : 'Aggiungi'}</button>
                  <button type="button" onClick={() => { setShowDebtForm(false); setEditingDebtId(null) }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Annulla</button>
                </div>
              </form>
            </div>
          )}

          {debts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">Nessun Debito</p>
            </div>
          ) : (
            <div className="space-y-3">
              {debts.map(d => {
                const paid = d.principal_amount > 0 ? ((d.principal_amount - d.remaining_balance) / d.principal_amount) * 100 : 0
                return (
                  <div key={d.id} className="group rounded-xl border border-border bg-card p-5 hover:bg-secondary/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-red-50 dark:bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                            {DEBT_TYPES.find(dt => dt.value === d.debt_type)?.label || d.debt_type}
                          </span>
                          <h3 className="font-semibold text-foreground">{d.lender}</h3>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                          <p className="text-muted-foreground">Capitale: <span className="text-foreground">€{d.principal_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span></p>
                          <p className="text-muted-foreground">Residuo: <span className="text-red-600 dark:text-red-400">€{d.remaining_balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span></p>
                          <p className="text-muted-foreground">Tasso: <span className="text-foreground">{d.interest_rate}%</span></p>
                          <p className="text-muted-foreground">Rata: <span className="text-foreground">€{d.monthly_payment.toLocaleString('it-IT', { minimumFractionDigits: 2 })}/mese</span></p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => { setDebtForm({ debt_type: d.debt_type, lender: d.lender, principal_amount: d.principal_amount, interest_rate: d.interest_rate, remaining_balance: d.remaining_balance, monthly_payment: d.monthly_payment, start_date: d.start_date, end_date: d.end_date, currency: d.currency }); setEditingDebtId(d.id); setShowDebtForm(true) }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => { if (confirm('Eliminare?')) deleteDebt(d.id) }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Pagato: {paid.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(paid, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
