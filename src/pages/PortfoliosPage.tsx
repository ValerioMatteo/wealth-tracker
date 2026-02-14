import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import { Briefcase, Plus, Pencil, Trash2, Star, X, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import type { Currency } from '@/types'

const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF', 'JPY']

interface FormState {
  name: string
  description: string
  currency: Currency
  is_default: boolean
}

const emptyForm: FormState = { name: '', description: '', currency: 'EUR', is_default: false }

export function PortfoliosPage() {
  const {
    portfolios,
    allAssets,
    isLoading,
    fetchPortfolios,
    fetchAllAssets,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
  } = usePortfolioStore()

  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPortfolios()
  }, [fetchPortfolios])

  useEffect(() => {
    if (portfolios.length > 0) fetchAllAssets()
  }, [portfolios, fetchAllAssets])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    if (editingId) {
      await updatePortfolio(editingId, form)
    } else {
      await createPortfolio(form)
    }
    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleEdit = (e: React.MouseEvent, p: typeof portfolios[0]) => {
    e.stopPropagation()
    setForm({
      name: p.name,
      description: p.description || '',
      currency: p.currency,
      is_default: p.is_default,
    })
    setEditingId(p.id)
    setShowForm(true)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Eliminare questo portfolio e tutti i suoi asset?')) return
    await deletePortfolio(id)
  }

  const getPortfolioStats = (portfolioId: string) => {
    const pAssets = allAssets.filter(a => a.portfolio_id === portfolioId)
    const totalValue = pAssets.reduce((sum, a) => sum + (a.current_value || 0), 0)
    const totalCost = pAssets.reduce((sum, a) => sum + a.purchase_price * a.quantity, 0)
    const gain = totalValue - totalCost
    const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0
    return { assetCount: pAssets.length, totalValue, gain, gainPercent }
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
          <h1 className="text-2xl font-bold text-foreground">Portfolios</h1>
          <p className="text-sm text-muted-foreground">Gestisci i tuoi portfolios di investimento</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true) }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuovo Portfolio
        </button>
      </div>

      {/* Form modale */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {editingId ? 'Modifica Portfolio' : 'Nuovo Portfolio'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                placeholder="Es. Portfolio Principale"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Descrizione</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                placeholder="Descrizione opzionale"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={e => setForm({ ...form, is_default: e.target.checked })}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Portfolio predefinito
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : editingId ? 'Aggiorna' : 'Crea'}
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

      {/* Lista portfolios */}
      {portfolios.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <Briefcase className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Nessun Portfolio</h2>
          <p className="mt-1 text-sm text-muted-foreground">Crea il tuo primo portfolio per iniziare</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map(p => {
            const pStats = getPortfolioStats(p.id)

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/portfolios/${p.id}`)}
                className="group relative cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
              >
                {p.is_default && (
                  <Star className="absolute right-3 top-3 h-4 w-4 fill-primary text-primary" />
                )}

                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                  {p.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{p.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Valore</span>
                    <span className="text-sm font-semibold text-foreground">
                      €{pStats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Gain/Loss</span>
                    <span className={`flex items-center gap-1 text-sm font-medium ${pStats.gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {pStats.gain >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {pStats.gain >= 0 ? '+' : ''}{pStats.gainPercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Asset</span>
                    <span className="text-sm text-foreground">{pStats.assetCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Valuta</span>
                    <span className="text-sm text-foreground">{p.currency}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => handleEdit(e, p)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, p.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <span>Apri</span>
                    <ChevronRight className="h-3 w-3" />
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
