import { useEffect, useState } from 'react'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import { CreditCard, Plus, Pencil, Trash2, X } from 'lucide-react'
import type { DebtType, Currency } from '@/types'

const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: 'mortgage', label: 'Mutuo' },
  { value: 'loan', label: 'Prestito' },
  { value: 'credit_card', label: 'Carta di credito' },
  { value: 'line_of_credit', label: 'Fido bancario' },
]

const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF', 'JPY']

const debtTypeLabel = (t: string) => DEBT_TYPES.find(d => d.value === t)?.label || t

interface DebtForm {
  debt_type: DebtType
  lender: string
  principal_amount: number
  interest_rate: number
  remaining_balance: number
  monthly_payment: number
  start_date: string
  end_date: string
  currency: Currency
}

const emptyForm: DebtForm = {
  debt_type: 'mortgage',
  lender: '',
  principal_amount: 0,
  interest_rate: 0,
  remaining_balance: 0,
  monthly_payment: 0,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  currency: 'EUR',
}

export function DebtsPage() {
  const {
    debts,
    isLoading,
    fetchDebts,
    createDebt,
    updateDebt,
    deleteDebt,
  } = usePortfolioStore()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DebtForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchDebts() }, [fetchDebts])

  const totalDebt = debts.reduce((sum, d) => sum + d.remaining_balance, 0)
  const totalMonthly = debts.reduce((sum, d) => sum + d.monthly_payment, 0)
  const avgRate = debts.length > 0
    ? debts.reduce((sum, d) => sum + d.interest_rate, 0) / debts.length
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.lender.trim()) return
    setSaving(true)
    if (editingId) {
      await updateDebt(editingId, form)
    } else {
      await createDebt(form)
    }
    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleEdit = (d: typeof debts[0]) => {
    setForm({
      debt_type: d.debt_type,
      lender: d.lender,
      principal_amount: d.principal_amount,
      interest_rate: d.interest_rate,
      remaining_balance: d.remaining_balance,
      monthly_payment: d.monthly_payment,
      start_date: d.start_date,
      end_date: d.end_date,
      currency: d.currency,
    })
    setEditingId(d.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo debito?')) return
    await deleteDebt(id)
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
          <h1 className="text-2xl font-bold text-foreground">Debiti</h1>
          <p className="text-sm text-muted-foreground">Gestisci mutui, prestiti e carte di credito</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true) }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuovo Debito
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Debito Residuo Totale</p>
          <p className="mt-1 text-2xl font-bold text-red-400">€{totalDebt.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Rata Mensile Totale</p>
          <p className="mt-1 text-2xl font-bold text-foreground">€{totalMonthly.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Tasso Medio</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{avgRate.toFixed(2)}%</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {editingId ? 'Modifica Debito' : 'Nuovo Debito'}
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
                  value={form.debt_type}
                  onChange={e => setForm({ ...form, debt_type: e.target.value as DebtType })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                >
                  {DEBT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Creditore *</label>
                <input
                  type="text"
                  value={form.lender}
                  onChange={e => setForm({ ...form, lender: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  placeholder="Es. Banca Intesa"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Valuta</label>
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value as Currency })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Capitale Iniziale (€)</label>
                <input
                  type="number"
                  step="any"
                  value={form.principal_amount || ''}
                  onChange={e => setForm({ ...form, principal_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Residuo (€)</label>
                <input
                  type="number"
                  step="any"
                  value={form.remaining_balance || ''}
                  onChange={e => setForm({ ...form, remaining_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Tasso (%)</label>
                <input
                  type="number"
                  step="any"
                  value={form.interest_rate || ''}
                  onChange={e => setForm({ ...form, interest_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Rata Mensile (€)</label>
                <input
                  type="number"
                  step="any"
                  value={form.monthly_payment || ''}
                  onChange={e => setForm({ ...form, monthly_payment: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Data Inizio</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Data Fine</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
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

      {/* List */}
      {debts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Nessun Debito</h2>
          <p className="mt-1 text-sm text-muted-foreground">Registra mutui, prestiti e carte di credito</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map(debt => {
            const paidPercent = debt.principal_amount > 0
              ? ((debt.principal_amount - debt.remaining_balance) / debt.principal_amount) * 100
              : 0

            return (
              <div
                key={debt.id}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-secondary/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                        {debtTypeLabel(debt.debt_type)}
                      </span>
                      <h3 className="font-semibold text-foreground">{debt.lender}</h3>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      <p className="text-muted-foreground">Capitale: <span className="text-foreground">€{debt.principal_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span></p>
                      <p className="text-muted-foreground">Residuo: <span className="text-red-400">€{debt.remaining_balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span></p>
                      <p className="text-muted-foreground">Tasso: <span className="text-foreground">{debt.interest_rate}%</span></p>
                      <p className="text-muted-foreground">Rata: <span className="text-foreground">€{debt.monthly_payment.toLocaleString('it-IT', { minimumFractionDigits: 2 })}/mese</span></p>
                      <p className="text-muted-foreground">Inizio: <span className="text-foreground">{new Date(debt.start_date).toLocaleDateString('it-IT')}</span></p>
                      <p className="text-muted-foreground">Fine: <span className="text-foreground">{new Date(debt.end_date).toLocaleDateString('it-IT')}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleEdit(debt)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Pagato: {paidPercent.toFixed(1)}%</span>
                    <span>€{(debt.principal_amount - debt.remaining_balance).toLocaleString('it-IT', { minimumFractionDigits: 2 })} / €{debt.principal_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(paidPercent, 100)}%` }}
                    />
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
