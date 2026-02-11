export function PortfolioChart({ portfolioId }: { portfolioId: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
      <p className="text-gray-500">Grafico performance portfolio - Coming soon</p>
    </div>
  )
}

export function AssetAllocationChart({ allocation }: { allocation: any[] }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
      <p className="text-gray-500">Grafico asset allocation - Coming soon</p>
    </div>
  )
}

export function TopPerformersTable({ assets, type }: { assets: any[]; type: string }) {
  if (!assets || assets.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        Nessun asset trovato
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Asset</th>
            <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Valore</th>
            <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Gain/Loss</th>
          </tr>
        </thead>
        <tbody>
          {assets.slice(0, 5).map((asset) => {
            const gain = asset.current_value - (asset.purchase_price * asset.quantity)
            const gainPercent = (gain / (asset.purchase_price * asset.quantity)) * 100
            
            return (
              <tr key={asset.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-xs text-gray-500">{asset.symbol || asset.asset_type}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  €{asset.current_value.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-right ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
    <div className="py-8 text-center text-gray-500">
      Prossimi cash flows - Coming soon
    </div>
  )
}
