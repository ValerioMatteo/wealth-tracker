export function PortfolioChart({ portfolioId }: { portfolioId: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
      <p className="text-muted-foreground">Grafico performance portfolio - Coming soon</p>
    </div>
  )
}

export function AssetAllocationChart({ allocation }: { allocation: any[] }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
      <p className="text-muted-foreground">Grafico asset allocation - Coming soon</p>
    </div>
  )
}

export function TopPerformersTable({ assets, type }: { assets: any[]; type: string }) {
  if (!assets || assets.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Nessun asset trovato
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Asset</th>
            <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Valore</th>
            <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Gain/Loss</th>
          </tr>
        </thead>
        <tbody>
          {assets.slice(0, 5).map((asset) => {
            const gain = asset.current_value - (asset.purchase_price * asset.quantity)
            const gainPercent = (gain / (asset.purchase_price * asset.quantity)) * 100

            return (
              <tr key={asset.id} className="border-b border-border transition-colors hover:bg-secondary">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.symbol || asset.asset_type}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  €{asset.current_value.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-right ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {gain >= 0 ? '+' : ''}€{gain.toFixed(2)}
                  <br />
                  <span className="text-xs">
                    ({gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function UpcomingCashFlows({ portfolioId }: { portfolioId: string }) {
  return (
    <div className="py-8 text-center text-muted-foreground">
      Prossimi cash flows - Coming soon
    </div>
  )
}
