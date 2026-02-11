import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface Portfolio {
  id: string
  user_id: string
  name: string
  currency: string
  is_default: boolean
}

interface Asset {
  id: string
  portfolio_id: string
  asset_type: string
  symbol: string | null
  name: string
  quantity: number
  purchase_price: number
  current_price: number
  current_value: number
}

interface PortfolioState {
  portfolios: Portfolio[]
  currentPortfolio: Portfolio | null
  assets: Asset[]
  isLoading: boolean
  error: string | null
  fetchPortfolios: () => Promise<void>
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  portfolios: [],
  currentPortfolio: null,
  assets: [],
  isLoading: false,
  error: null,
  
  fetchPortfolios: async () => {
  console.log('📊 START fetch')
  set({ isLoading: true })
  
  const result = await supabase.auth.getUser()
  const user = result.data.user
  
  if (!user) {
    set({ isLoading: false })
    return
  }
  
  const portfoliosResult = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', user.id)
  
  const portfolios = (portfoliosResult.data || []) as Portfolio[]
  const firstPortfolio = portfolios.length > 0 ? portfolios[0] : null
  
  set({ 
    portfolios: portfolios, 
    currentPortfolio: firstPortfolio, 
    isLoading: false 
  })
  
  if (firstPortfolio) {
    const assetsResult = await supabase
      .from('assets')
      .select('*')
      .eq('portfolio_id', firstPortfolio.id)
    
    const assets = (assetsResult.data || []) as Asset[]
    set({ assets: assets })
  }
  
  console.log('✅ DONE fetch')
},
}))