import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePortfolioStore } from '@/stores/usePortfolioStore'

export function DashboardPage() {
  const {
    currentPortfolio,
    assets,
    isLoading,
    fetchPortfolios,
  } = usePortfolioStore()

  useEffect(() => {
    fetchPortfolios()
  }, [fetchPortfolios])

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
            <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Nessun Portfolio Trovato</h2>
          <p className="mt-2 text-muted-foreground">Hai creato il portfolio nel database Supabase?</p>
          <p className="mt-1 text-sm text-muted-foreground">Email utente: {useAuthStore.getState().user?.email}</p>
        </div>
      </div>
    )
  }

  const totalValue = assets.reduce((sum, a) => sum + (a.current_value || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{currentPortfolio.name}</h1>
        <p className="text-muted-foreground">Valuta: {currentPortfolio.currency}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Valore Totale</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            €{totalValue.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Numero Assets</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{assets.length}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Assets ({assets.length})</h2>
        <div className="space-y-3">
          {assets.map(asset => (
            <div
              key={asset.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary"
            >
              <div>
                <p className="font-medium text-foreground">{asset.name}</p>
                <p className="text-sm text-muted-foreground">{asset.symbol}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">€{asset.current_value?.toFixed(2) || '0.00'}</p>
                <p className="text-sm text-muted-foreground">Qtà: {asset.quantity}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
