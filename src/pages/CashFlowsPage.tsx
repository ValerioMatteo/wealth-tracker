import { useEffect, useState } from 'react'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import { DollarSign, Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react'
import type { CashFlowType } from '@/types'

const FLOW_TYPES: { value: CashFlowType; label: string }[] = [
  { value: 'dividend', label: 'Dividendo' },
  { value: 'coupon', label: 'Cedola' },
  { value: 'rent', label: 'Affitto' },
  { value: 'interest', label: 'Interesse' },
  { value: 'other', label: 'Altro' },
]

const flowTypeLabel = (t: string) => FLOW_TYPES.find(f => f.value === t)?.label || t

interface CFForm {
  flow_type: CashFlowType
  amount: number
  payment_date: string
  is_forecasted: boolean
  is_recurring: boolean
  notes: string
  asset_id: string
}

const emptyForm: CFForm = {
  flow_type: 'dividend',
  amount: 0,
  payment_date: new Date().toISOString().slice(0, 10),
  is_forecasted: false,
  is_recurring: false,
  notes: '',
  asset_id: '',
}

export function CashFlowsPage() {
  const {
    currentPortfolio,
    assets,
    cashFlows,
    isLoading,
    fetchPortfolios,
    fetchCashFlows,
    createCashFlow,
    updateCashFlow,
    deleteCashFlow,
  } = usePortfolioStore()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CFForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPortfolios() }, [fetchPortfolios])
  useEffect(() => {
    if (currentPortfolio) fetchCashFlows(currentPortfolio.id)
  }, [currentPortfolio, fetchCashFlows])

  const totalReceived = cashFlows
    .filter(cf => !cf.is_forecasted)
    .reduce((sum, cf) => sum + cf.amount, 0)
  const totalForecasted = cashFlows
    .filter(cf => cf.is_forecasted)
    .reduce((sum, cf) => sum + cf.amount, 0)

  const getAssetName = (id: string | null) => {
    if (!id) return '-'
    const a = assets.find(x => x.id === id)
    return a ? a.name : '-'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (editingId) {
      await updateCashFlow(editingId, form)
    } else {
      await createCashFlow(form)
    }
    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleEdit = (cf: typeof cashFlows[0]) => {
    setForm({
      flow_type: cf.flow_type,
      amount: cf.amount,
      payment_date: cf.payment_date,
      is_forecasted: cf.is_forecasted,
      is_recurring: cf.is_recurring,
      notes: cf.notes || '',
      asset_id: cf.asset_id || '',
    })
    setEditingId(cf.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo flusso di cassa?')) return
    await deleteCashFlow(id)
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
        <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Nessun Portfolio Selezionato</h2>
        <p className="mt-1 text-sm text-muted-foreground">Seleziona un portfolio dalla sezione Portfolios</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Flows</h1>
          <p className="text-sm text-muted-foreground">Flussi di cassa del portfolio {currentPortfolio.name}</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true) }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuovo Cash Flow
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Totale Cash Flows</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{cashFlows.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Ricevuti</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">€{totalReceived.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Previsti</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">€{totalForecasted.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {editingId ? 'Modifica Cash Flow' : 'Nuovo Cash Flow'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Tipo *</label>
                <select
                  value={form.flow_type}
                  onChange={e => setForm({ ...form, flow_type: e.target.value as CashFlowType })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                >
                  {FLOW_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Importo (€) *</label>
                <input
                  type="number"
                  step="any"
                  value={form.amount || ''}
                  onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Data Pagamento</label>
                <input
                  type="date"
                  value={form.payment_date}
                  onChange={e => setForm({ ...form, payment_date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Asset (opzionale)</label>
                <select
                  value={form.asset_id}
                  onChange={e => setForm({ ...form, asset_id: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">Nessun asset</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
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
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.is_forecasted}
                  onChange={e => setForm({ ...form, is_forecasted: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Previsto (non ricevuto)
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.is_recurring}
                  onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Ricorrente
              </label>
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

      {/* List */}
      {cashFlows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Nessun Cash Flow</h2>
          <p className="mt-1 text-sm text-muted-foreground">Registra il tuo primo flusso di cassa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cashFlows.map(cf => (
            <div
              key={cf.id}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  cf.is_forecasted ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'
                }`}>
                  {cf.is_recurring
                    ? <RefreshCw className={`h-5 w-5 ${cf.is_forecasted ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    : <DollarSign className={`h-5 w-5 ${cf.is_forecasted ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  }
                </div>
                <div>
                  <p className="font-medium text-foreground">{flowTypeLabel(cf.flow_type)}</p>
                  <p className="text-sm text-muted-foreground">
                    {getAssetName(cf.asset_id)} - {new Date(cf.payment_date).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`font-medium ${cf.is_forecasted ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    €{cf.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {cf.is_forecasted && <span className="rounded bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 text-blue-600 dark:text-blue-400">Previsto</span>}
                    {cf.is_recurring && <span className="rounded bg-secondary px-1.5 py-0.5">Ricorrente</span>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleEdit(cf)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cf.id)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
