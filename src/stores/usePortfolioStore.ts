import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Portfolio, Asset, Transaction, CashFlow, Debt, TaxEvent, AIValuationResult } from '@/types'


interface AIValuationState {
  isLoading: boolean
  assetId: string | null
  result: AIValuationResult | null
  error: string | null
}

interface PortfolioState {
  portfolios: Portfolio[]
  currentPortfolio: Portfolio | null
  assets: Asset[]
  allAssets: Asset[]
  transactions: Transaction[]
  allTransactions: Transaction[]
  cashFlows: CashFlow[]
  allCashFlows: CashFlow[]
  debts: Debt[]
  taxEvents: TaxEvent[]
  isLoading: boolean
  error: string | null

  // Price refresh state
  isRefreshingPrices: boolean
  lastPriceRefresh: string | null
  priceRefreshError: string | null

  // AI Valuation state
  aiValuation: AIValuationState

  // Portfolio actions
  fetchPortfolios: () => Promise<void>
  setCurrentPortfolio: (portfolio: Portfolio) => void
  createPortfolio: (data: Partial<Portfolio>) => Promise<void>
  updatePortfolio: (id: string, data: Partial<Portfolio>) => Promise<void>
  deletePortfolio: (id: string) => Promise<void>

  // Asset actions
  fetchAssets: (portfolioId: string) => Promise<void>
  fetchAllAssets: () => Promise<void>
  createAsset: (data: Partial<Asset>) => Promise<void>
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>
  deleteAsset: (id: string) => Promise<void>

  // Price refresh actions
  refreshPrices: (portfolioId: string) => Promise<void>

  // AI Valuation actions
  requestAiValuation: (assetId: string) => Promise<void>
  acceptAiValuation: (assetId: string, value: number) => Promise<void>
  clearAiValuation: () => void

  // Transaction actions
  fetchTransactions: (assetId?: string) => Promise<void>
  fetchAllTransactions: () => Promise<void>
  createTransaction: (data: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>

  // Cash Flow actions
  fetchCashFlows: (portfolioId: string) => Promise<void>
  fetchAllCashFlows: () => Promise<void>
  createCashFlow: (data: Partial<CashFlow>) => Promise<void>
  updateCashFlow: (id: string, data: Partial<CashFlow>) => Promise<void>
  deleteCashFlow: (id: string) => Promise<void>

  // Debt actions
  fetchDebts: () => Promise<void>
  createDebt: (data: Partial<Debt>) => Promise<void>
  updateDebt: (id: string, data: Partial<Debt>) => Promise<void>
  deleteDebt: (id: string) => Promise<void>

  // Tax actions
  fetchTaxEvents: (taxYear?: number) => Promise<void>
  saveTaxEvents: (events: TaxEvent[]) => Promise<void>
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  currentPortfolio: null,
  assets: [],
  allAssets: [],
  transactions: [],
  allTransactions: [],
  cashFlows: [],
  allCashFlows: [],
  debts: [],
  taxEvents: [],
  isLoading: false,
  error: null,

  // Price refresh state
  isRefreshingPrices: false,
  lastPriceRefresh: null,
  priceRefreshError: null,

  // AI Valuation state
  aiValuation: { isLoading: false, assetId: null, result: null, error: null },

  // --- Portfolios ---
  fetchPortfolios: async () => {
    set({ isLoading: true, error: null })
    const result = await supabase.auth.getUser()
    const user = result.data.user
    if (!user) { set({ isLoading: false }); return }

    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) { set({ isLoading: false, error: error.message }); return }

    const portfolios = (data || []) as Portfolio[]
    const current = get().currentPortfolio
    const activePortfolio = current && portfolios.find(p => p.id === current.id)
      ? current
      : portfolios.find(p => p.is_default) || portfolios[0] || null

    set({ portfolios, currentPortfolio: activePortfolio, isLoading: false })

    if (activePortfolio) {
      get().fetchAssets(activePortfolio.id)
    }
  },

  setCurrentPortfolio: (portfolio) => {
    set({ currentPortfolio: portfolio })
    get().fetchAssets(portfolio.id)
  },

  createPortfolio: async (data) => {
    const result = await supabase.auth.getUser()
    const user = result.data.user
    if (!user) return

    const { error } = await supabase.from('portfolios').insert({
      user_id: user.id,
      name: data.name || 'Nuovo Portfolio',
      description: data.description || null,
      currency: data.currency || 'EUR',
      is_default: data.is_default || false,
    })

    if (error) { set({ error: error.message }); return }
    await get().fetchPortfolios()
  },

  updatePortfolio: async (id, data) => {
    const { error } = await supabase.from('portfolios').update(data).eq('id', id)
    if (error) { set({ error: error.message }); return }
    await get().fetchPortfolios()
  },

  deletePortfolio: async (id) => {
    const { error } = await supabase.from('portfolios').delete().eq('id', id)
    if (error) { set({ error: error.message }); return }
    set({ currentPortfolio: null })
    await get().fetchPortfolios()
  },

  // --- Assets ---
  fetchAssets: async (portfolioId) => {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('name', { ascending: true })

    if (error) { set({ error: error.message }); return }
    set({ assets: (data || []) as Asset[] })
  },

  fetchAllAssets: async () => {
    const result = await supabase.auth.getUser()
    const user = result.data.user
    if (!user) return

    const portfolios = get().portfolios
    if (portfolios.length === 0) return

    const portfolioIds = portfolios.map(p => p.id)
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .in('portfolio_id', portfolioIds)
      .order('name', { ascending: true })

    if (error) { set({ error: error.message }); return }
    set({ allAssets: (data || []) as Asset[] })
  },

  createAsset: async (data) => {
    const portfolio = get().currentPortfolio
    if (!portfolio) return

    const { error } = await supabase.from('assets').insert({
      portfolio_id: data.portfolio_id || portfolio.id,
      asset_type: data.asset_type || 'stock',
      symbol: data.symbol || null,
      name: data.name || '',
      quantity: data.quantity || 0,
      purchase_price: data.purchase_price || 0,
      purchase_date: data.purchase_date || new Date().toISOString().slice(0, 10),
      current_price: data.current_price || data.purchase_price || 0,
      metadata: data.metadata || {},
    })

    if (error) { set({ error: error.message }); return }
    await get().fetchAssets(portfolio.id)
  },

  updateAsset: async (id, data) => {
    const { error } = await supabase.from('assets').update(data).eq('id', id)
    if (error) { set({ error: error.message }); return }
    const portfolio = get().currentPortfolio
    if (portfolio) await get().fetchAssets(portfolio.id)
  },

  deleteAsset: async (id) => {
    const { error } = await supabase.from('assets').delete().eq('id', id)
    if (error) { set({ error: error.message }); return }
    const portfolio = get().currentPortfolio
    if (portfolio) await get().fetchAssets(portfolio.id)
  },

  // --- Price Refresh ---
  refreshPrices: async (portfolioId: string) => {
    set({ isRefreshingPrices: true, priceRefreshError: null })

    try {
      const response = await supabase.functions.invoke('refresh-prices', {
        body: { portfolio_id: portfolioId },
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      // Re-fetch assets per ottenere i prezzi aggiornati
      await get().fetchAssets(portfolioId)

      set({
        isRefreshingPrices: false,
        lastPriceRefresh: new Date().toISOString(),
      })
    } catch (error) {
      set({
        isRefreshingPrices: false,
        priceRefreshError: error instanceof Error ? error.message : 'Errore aggiornamento prezzi',
      })
    }
  },

  // --- AI Valuation ---
  requestAiValuation: async (assetId: string) => {
    const asset = get().assets.find(a => a.id === assetId)
    if (!asset) return

    set({ aiValuation: { isLoading: true, assetId, result: null, error: null } })

    try {
      const response = await supabase.functions.invoke('ai-valuate', {
        body: {
          asset_id: asset.id,
          asset_type: asset.asset_type,
          name: asset.name,
          purchase_price: asset.purchase_price,
          purchase_date: asset.purchase_date,
          metadata: asset.metadata,
        },
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      set({
        aiValuation: {
          isLoading: false,
          assetId,
          result: response.data as AIValuationResult,
          error: null,
        },
      })
    } catch (error) {
      set({
        aiValuation: {
          isLoading: false,
          assetId,
          result: null,
          error: error instanceof Error ? error.message : 'Errore valutazione AI',
        },
      })
    }
  },

  acceptAiValuation: async (assetId: string, value: number) => {
    await get().updateAsset(assetId, {
      current_price: value,
      last_updated: new Date().toISOString(),
    } as Partial<Asset>)
    set({ aiValuation: { isLoading: false, assetId: null, result: null, error: null } })
  },

  clearAiValuation: () => {
    set({ aiValuation: { isLoading: false, assetId: null, result: null, error: null } })
  },

  // --- Transactions ---
  fetchTransactions: async (assetId) => {
    const portfolio = get().currentPortfolio
    if (!portfolio) return

    let query = supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })

    if (assetId) {
      query = query.eq('asset_id', assetId)
    } else {
      const assetIds = get().assets.map(a => a.id)
      if (assetIds.length > 0) {
        query = query.in('asset_id', assetIds)
      } else {
        set({ transactions: [] })
        return
      }
    }

    const { data, error } = await query
    if (error) { set({ error: error.message }); return }
    set({ transactions: (data || []) as Transaction[] })
  },

  fetchAllTransactions: async () => {
    const allAssets = get().allAssets
    if (allAssets.length === 0) {
      set({ allTransactions: [] })
      return
    }

    const assetIds = allAssets.map(a => a.id)
    // Supabase IN clause has limits, batch if needed
    const batchSize = 100
    const allTx: Transaction[] = []
    for (let i = 0; i < assetIds.length; i += batchSize) {
      const batch = assetIds.slice(i, i + batchSize)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .in('asset_id', batch)
        .order('transaction_date', { ascending: false })

      if (error) { set({ error: error.message }); return }
      allTx.push(...((data || []) as Transaction[]))
    }

    set({ allTransactions: allTx })
  },

  createTransaction: async (data) => {
    const totalAmount = (data.quantity || 0) * (data.price || 0) + (data.fees || 0)

    const { error } = await supabase.from('transactions').insert({
      asset_id: data.asset_id,
      transaction_type: data.transaction_type || 'buy',
      quantity: data.quantity || 0,
      price: data.price || 0,
      fees: data.fees || 0,
      total_amount: totalAmount,
      transaction_date: data.transaction_date || new Date().toISOString().slice(0, 10),
      notes: data.notes || null,
    })

    if (error) { set({ error: error.message }); return }
    await get().fetchTransactions()
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { set({ error: error.message }); return }
    await get().fetchTransactions()
  },

  // --- Cash Flows ---
  fetchCashFlows: async (portfolioId) => {
    const { data, error } = await supabase
      .from('cash_flows')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('payment_date', { ascending: false })

    if (error) { set({ error: error.message }); return }
    set({ cashFlows: (data || []) as CashFlow[] })
  },

  fetchAllCashFlows: async () => {
    const portfolios = get().portfolios
    if (portfolios.length === 0) return

    const portfolioIds = portfolios.map(p => p.id)
    const { data, error } = await supabase
      .from('cash_flows')
      .select('*')
      .in('portfolio_id', portfolioIds)
      .order('payment_date', { ascending: false })

    if (error) { set({ error: error.message }); return }
    set({ allCashFlows: (data || []) as CashFlow[] })
  },

  createCashFlow: async (data) => {
    const portfolio = get().currentPortfolio
    if (!portfolio) return

    const { error } = await supabase.from('cash_flows').insert({
      portfolio_id: data.portfolio_id || portfolio.id,
      asset_id: data.asset_id || null,
      flow_type: data.flow_type || 'dividend',
      amount: data.amount || 0,
      currency: data.currency || portfolio.currency || 'EUR',
      payment_date: data.payment_date || new Date().toISOString().slice(0, 10),
      is_forecasted: data.is_forecasted || false,
      is_recurring: data.is_recurring || false,
      recurrence_rule: data.recurrence_rule || null,
      notes: data.notes || null,
    })

    if (error) { set({ error: error.message }); return }
    await get().fetchCashFlows(portfolio.id)
  },

  updateCashFlow: async (id, data) => {
    const { error } = await supabase.from('cash_flows').update(data).eq('id', id)
    if (error) { set({ error: error.message }); return }
    const portfolio = get().currentPortfolio
    if (portfolio) await get().fetchCashFlows(portfolio.id)
  },

  deleteCashFlow: async (id) => {
    const { error } = await supabase.from('cash_flows').delete().eq('id', id)
    if (error) { set({ error: error.message }); return }
    const portfolio = get().currentPortfolio
    if (portfolio) await get().fetchCashFlows(portfolio.id)
  },

  // --- Debts ---
  fetchDebts: async () => {
    const result = await supabase.auth.getUser()
    const user = result.data.user
    if (!user) return

    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message }); return }
    set({ debts: (data || []) as Debt[] })
  },

  createDebt: async (data) => {
    const result = await supabase.auth.getUser()
    const user = result.data.user
    if (!user) return

    const { error } = await supabase.from('debts').insert({
      user_id: user.id,
      debt_type: data.debt_type || 'loan',
      lender: data.lender || '',
      principal_amount: data.principal_amount || 0,
      interest_rate: data.interest_rate || 0,
      remaining_balance: data.remaining_balance || data.principal_amount || 0,
      monthly_payment: data.monthly_payment || 0,
      start_date: data.start_date || new Date().toISOString().slice(0, 10),
      end_date: data.end_date || new Date().toISOString().slice(0, 10),
      currency: data.currency || 'EUR',
      metadata: data.metadata || {},
    })

    if (error) { set({ error: error.message }); return }
    await get().fetchDebts()
  },

  updateDebt: async (id, data) => {
    const { error } = await supabase.from('debts').update(data).eq('id', id)
    if (error) { set({ error: error.message }); return }
    await get().fetchDebts()
  },

  deleteDebt: async (id) => {
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (error) { set({ error: error.message }); return }
    await get().fetchDebts()
  },

  // --- Tax Events ---
  fetchTaxEvents: async (taxYear) => {
    const result = await supabase.auth.getUser()
    const user = result.data.user
    if (!user) return

    let query = supabase
      .from('tax_events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: false })

    if (taxYear) {
      query = query.eq('tax_year', taxYear)
    }

    const { data, error } = await query
    if (error) { set({ error: error.message }); return }
    set({ taxEvents: (data || []) as TaxEvent[] })
  },

  saveTaxEvents: async (events) => {
    if (events.length === 0) return
    const inserts = events.map(e => ({
      user_id: e.user_id,
      tax_year: e.tax_year,
      event_type: e.event_type,
      taxable_amount: e.taxable_amount,
      tax_rate: e.tax_rate,
      tax_owed: e.tax_owed,
      asset_id: e.asset_id,
      event_date: e.event_date,
      notes: e.notes,
    }))
    const { error } = await supabase.from('tax_events').insert(inserts)
    if (error) { set({ error: error.message }); return }
    const first = events[0]
    if (first) await get().fetchTaxEvents(first.tax_year)
  },
}))
