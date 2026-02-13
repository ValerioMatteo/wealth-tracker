import { useEffect, useState } from 'react'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, X, Search } from 'lucide-react'
import type { AssetType } from '@/types'

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'stock', label: 'Azione' },
  { value: 'bond', label: 'Obbligazione' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'real_estate', label: 'Immobile' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'cash', label: 'Liquidità' },
]

const assetTypeLabel = (t: string) => ASSET_TYPES.find(a => a.value === t)?.label || t

interface AssetForm {
  asset_type: AssetType
  symbol: string
  name: string
  quantity: number
  purchase_price: number
  purchase_date: string
  current_price: number
}

const emptyForm: AssetForm = {
  asset_type: 'stock',
  symbol: '',
  name: '',
  quantity: 0,
  purchase_price: 0,
  purchase_date: new Date().toISOString().slice(0, 10),
  current_price: 0,
}

export function AssetsPage() {
  const {
    currentPortfolio,
    assets,
    isLoading,
    fetchPortfolios,
    createAsset,
    updateAsset,
    deleteAsset,
  } = usePortfolioStore()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AssetForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<AssetType | ''>('')

  useEffect(() => { fetchPortfolios() }, [fetchPortfolios])

  const filteredAssets = assets.filter(a => {
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.symbol && a.symbol.toLowerCase().includes(search.toLowerCase()))
    const matchesType = !filterType || a.asset_type === filterType
    return matchesSearch && matchesType
  })

  const totalValue = assets.reduce((sum, a) => sum + (a.current_value || 0), 0)
  const totalCost = assets.reduce((sum, a) => sum + a.purchase_price * a.quantity, 0)
  const totalGain = totalValue - totalCost
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const data = {
      ...form,
      current_value: form.quantity * form.current_price,
    }
    if (editingId) {
      await updateAsset(editingId, data)
    } else {
      await createAsset(data)
    }
    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleEdit = (a: typeof assets[0]) => {
    setForm({
      asset_type: a.asset_type,
      symbol: a.symbol || '',
      name: a.name,
      quantity: a.quantity,
      purchase_price: a.purchase_price,
      purchase_date: a.purchase_date,
      current_price: a.current_price,
    })
    setEditingId(a.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo asset?')) return
    await deleteAsset(id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    )
  }

  if (!currentPortfolio) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Nessun Portfolio Selezionato</h2>
        <p className="mt-1 text-sm text-muted-foreground">Crea prima un portfolio dalla sezione Portfolios</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assets</h1>
          <p className="text-sm text-muted-foreground">{currentPortfolio.name} - {assets.length} asset</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true) }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Aggiungi Asset
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Valore Totale</p>
          <p className="mt-1 text-2xl font-bold text-foreground">€{totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Costo Totale</p>
          <p className="mt-1 text-2xl font-bold text-foreground">€{totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Guadagno/Perdita</p>
          <p className={`mt-1 text-2xl font-bold ${totalGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {totalGain >= 0 ? '+' : ''}€{totalGain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            <span className="ml-2 text-sm">({totalGain >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%)</span>
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {editingId ? 'Modifica Asset' : 'Nuovo Asset'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Tipo *</label>
                <select
                  value={form.asset_type}
                  onChange={e => setForm({ ...form, asset_type: e.target.value as AssetType })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                >
                  {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Simbolo</label>
                <input
                  type="text"
                  value={form.symbol}
                  onChange={e => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  placeholder="Es. AAPL, BTC"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                placeholder="Es. Apple Inc."
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Quantità *</label>
                <input
                  type="number"
                  step="any"
                  value={form.quantity || ''}
                  onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Prezzo Acquisto (€) *</label>
                <input
                  type="number"
                  step="any"
                  value={form.purchase_price || ''}
                  onChange={e => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Prezzo Attuale (€)</label>
                <input
                  type="number"
                  step="any"
                  value={form.current_price || ''}
                  onChange={e => setForm({ ...form, current_price: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Data Acquisto</label>
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={e => setForm({ ...form, purchase_date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : editingId ? 'Aggiorna' : 'Aggiungi'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null) }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            placeholder="Cerca asset..."
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as AssetType | '')}
          className="rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">Tutti i tipi</option>
          {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Assets list */}
      {filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Nessun Asset</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || filterType ? 'Nessun risultato per i filtri selezionati' : 'Aggiungi il tuo primo asset'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map(asset => {
            const gain = (asset.current_value || 0) - asset.purchase_price * asset.quantity
            const gainPercent = asset.purchase_price * asset.quantity > 0
              ? (gain / (asset.purchase_price * asset.quantity)) * 100
              : 0

            return (
              <div
                key={asset.id}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${gain >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
                    {gain >= 0
                      ? <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      : <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{asset.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.symbol && <span className="mr-2 font-mono">{asset.symbol}</span>}
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">{assetTypeLabel(asset.asset_type)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-medium text-foreground">€{(asset.current_value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    <p className={`text-sm ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {gain >= 0 ? '+' : ''}€{gain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      {' '}({gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Qtà: {asset.quantity}</p>
                    <p>PMC: €{asset.purchase_price.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleEdit(asset)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
