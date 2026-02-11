import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePortfolioStore } from '@/stores/usePortfolioStore'

export function DashboardPage() {
  console.log('🎯 DashboardPage MOUNTED!')
  
  const {
    currentPortfolio,
    assets,
    isLoading,
    fetchPortfolios,
  } = usePortfolioStore()
  
  // resto del codice...

  useEffect(() => {
    console.log('🔄 DashboardPage: fetchPortfolios chiamato')
    fetchPortfolios()
  }, [fetchPortfolios])

  console.log('📊 Dashboard render:', { isLoading, currentPortfolio, assets })

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Caricamento portfolio...</p>
      </div>
    )
  }

  if (!currentPortfolio) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>❌ Nessun Portfolio Trovato</h2>
        <p>Hai creato il portfolio nel database Supabase?</p>
        <p>Email utente: {useAuthStore.getState().user?.email}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>✅ {currentPortfolio.name}</h1>
      <p>Valuta: {currentPortfolio.currency}</p>
      
      <h2 style={{ marginTop: '30px' }}>Assets ({assets.length})</h2>
      {assets.map(asset => (
        <div key={asset.id} style={{ 
          padding: '10px', 
          margin: '10px 0', 
          border: '1px solid #ccc',
          borderRadius: '8px'
        }}>
          <strong>{asset.name}</strong> ({asset.symbol})
          <br />
          Quantità: {asset.quantity} | Valore: €{asset.current_value?.toFixed(2) || 0}
        </div>
      ))}
    </div>
  )
}