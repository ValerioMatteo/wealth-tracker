import { useEffect, useState } from 'react'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import { Receipt, Plus, Trash2, X, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { TransactionType } from '@/types'

const TX_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'buy', label: 'Acquisto' },
  { value: 'sell', label: 'Vendita' },
  { value: 'dividend', label: 'Dividendo' },
  { value: 'coupon', label: 'Cedola' },
  { value: 'split', label: 'Split' },
  { value: 'deposit', label: 'Deposito' },
  { value: 'withdrawal', label: 'Prelievo' },
]

const txTypeLabel = (t: string) => TX_TYPES.find(x => x.value === t)?.label || t

interface TxForm {
  asset_id: string
  transaction_type: TransactionType
  quantity: number
  price: number
  fees: number
  transaction_date: string
  notes: string
}

const emptyForm: TxForm = {
  asset_id: '',
  transaction_type: 'buy',
  quantity: 0,
  price: 0,
  fees: 0,
  transaction_date: new Date().toISOString().slice(0, 10),
  notes: '',
}

export function TransactionsPage() {
  const {
    currentPortfolio,
    assets,
    transactions,
    isLoading,
    fetchPortfolios,
    fetchTransactions,
    createTransaction,
    deleteTransaction,
  } = usePortfolioStore()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TxForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterAsset, setFilterAsset] = useState('')

  useEffect(() => { fetchPortfolios() }, [fetchPortfolios])
  useEffect(() => {
    if (assets.length > 0) fetchTransactions()
  }, [assets, fetchTransactions])

  const filteredTx = filterAsset
    ? transactions.filter(t => t.asset_id === filterAsset)
    : transactions

  const getAssetName = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId)
    return asset ? asset.name : assetId.slice(0, 8)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.asset_id) return
    setSaving(true)
    await createTransaction(form)
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa transazione?')) return
    await deleteTransaction(id)
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
        <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Nessun Portfolio Selezionato</h2>
        <p className="mt-1 text-sm text-muted-foreground">Seleziona un portfolio dalla sezione Portfolios</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transazioni</h1>
          <p className="text-sm text-muted-foreground">{currentPortfolio.name} - {transactions.length} transazioni</p>
        </div>
        <button
          onClick={() => { setForm({ ...emptyForm, asset_id: assets[0]?.id || '' }); setShowForm(true) }}
          disabled={assets.length === 0}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nuova Transazione
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Nuova Transazione</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Asset *</label>
                <select
                  value={form.asset_id}
                  onChange={e => setForm({ ...form, asset_id: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  required
                >
                  <option value="">Seleziona asset</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} {a.symbol ? `(${a.symbol})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Tipo *</label>
                <select
                  value={form.transaction_type}
                  onChange={e => setForm({ ...form, transaction_type: e.target.value as TransactionType })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                >
                  {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Quantità</label>
                <input
                  type="number"
                  step="any"
                  value={form.quantity || ''}
                  onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Prezzo (€)</label>
                <input
                  type="number"
                  step="any"
                  value={form.price || ''}
                  onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Commissioni (€)</label>
                <input
                  type="number"
                  step="any"
                  value={form.fees || ''}
                  onChange={e => setForm({ ...form, fees: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Data</label>
                <input
                  type="date"
                  value={form.transaction_date}
                  onChange={e => setForm({ ...form, transaction_date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Note</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                placeholder="Note opzionali"
              />
            </div>
            {form.quantity > 0 && form.price > 0 && (
              <p className="text-sm text-muted-foreground">
                Totale: €{(form.quantity * form.price + form.fees).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Registra'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div>
        <select
          value={filterAsset}
          onChange={e => setFilterAsset(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">Tutti gli asset</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Transactions list */}
      {filteredTx.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Nessuna Transazione</h2>
          <p className="mt-1 text-sm text-muted-foreground">Registra la tua prima transazione</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Asset</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Quantità</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Prezzo</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Totale</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => {
                const isBuy = tx.transaction_type === 'buy' || tx.transaction_type === 'deposit'
                return (
                  <tr key={tx.id} className="border-b border-border transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-3 text-sm text-foreground">
                      {new Date(tx.transaction_date).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {getAssetName(tx.asset_id)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                        isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {isBuy ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                        {txTypeLabel(tx.transaction_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">{tx.quantity}</td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">€{tx.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-foreground">€{tx.total_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
