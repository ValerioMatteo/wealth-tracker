// src/types/index.ts

export type SubscriptionTier = 'free' | 'premium' | 'professional'

export type AssetType =
  | 'stock'
  | 'bond'
  | 'etf'
  | 'crypto'
  | 'real_estate'
  | 'luxury'
  | 'commodity'
  | 'cash'

export type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'coupon'
  | 'split'
  | 'deposit'
  | 'withdrawal'

export type CashFlowType = 'dividend' | 'coupon' | 'rent' | 'interest' | 'other'

export type DebtType = 'mortgage' | 'loan' | 'credit_card' | 'line_of_credit'

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY'

// Database Types (matching Supabase schema)

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      portfolios: {
        Row: Portfolio
        Insert: Omit<Portfolio, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Portfolio, 'id' | 'created_at'>>
      }
      assets: {
        Row: Asset
        Insert: Omit<Asset, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Asset, 'id' | 'created_at'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>
      }
      cash_flows: {
        Row: CashFlow
        Insert: Omit<CashFlow, 'id' | 'created_at'>
        Update: Partial<Omit<CashFlow, 'id' | 'created_at'>>
      }
      debts: {
        Row: Debt
        Insert: Omit<Debt, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Debt, 'id' | 'created_at'>>
      }
      tax_events: {
        Row: TaxEvent
        Insert: Omit<TaxEvent, 'id' | 'created_at'>
        Update: Partial<Omit<TaxEvent, 'id' | 'created_at'>>
      }
      price_history: {
        Row: PriceHistory
        Insert: Omit<PriceHistory, 'id'>
        Update: Partial<Omit<PriceHistory, 'id'>>
      }
    }
  }
}

export interface Profile {
  id: string
  user_id: string
  email: string
  full_name: string | null
  subscription_tier: SubscriptionTier
  subscription_expires_at: string | null
  preferences: UserPreferences
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  default_currency: Currency
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY'
  theme: 'light' | 'dark' | 'system'
  notifications_enabled: boolean
  email_reports: boolean
}

export interface Portfolio {
  id: string
  user_id: string
  name: string
  description: string | null
  currency: Currency
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  portfolio_id: string
  asset_type: AssetType
  symbol: string | null
  name: string
  quantity: number
  purchase_price: number
  purchase_date: string
  current_price: number
  current_value: number
  last_updated: string
  metadata: AssetMetadata
  created_at: string
  updated_at: string
}

export interface AssetMetadata {
  // Stock/Bond/ETF
  isin?: string
  exchange?: string
  sector?: string
  country?: string

  // Crypto
  blockchain?: string
  wallet_address?: string

  // Real Estate
  address?: string
  property_type?: 'residential' | 'commercial' | 'land'
  size_sqm?: number

  // Luxury
  brand?: string
  model?: string
  serial_number?: string
  appraisal_date?: string
  certificate?: string

  // Commodity
  purity?: number
  weight_grams?: number
  storage_location?: string

  // AI Valuation (per asset non quotati)
  ai_valuation?: AIValuationResult

  // Custom fields
  [key: string]: unknown
}

export interface AIValuationResult {
  suggested_value: number
  confidence: 'low' | 'medium' | 'high'
  reasoning: string
  factors: string[]
  data_sources: string[]
  date: string
}

export interface Transaction {
  id: string
  asset_id: string
  transaction_type: TransactionType
  quantity: number
  price: number
  fees: number
  total_amount: number
  transaction_date: string
  notes: string | null
  created_at: string
}

export interface CashFlow {
  id: string
  portfolio_id: string
  asset_id: string | null
  flow_type: CashFlowType
  amount: number
  currency: Currency
  payment_date: string
  is_forecasted: boolean
  is_recurring: boolean
  recurrence_rule: RecurrenceRule | null
  notes: string | null
  created_at: string
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  interval: number
  end_date: string | null
  count: number | null
}

export interface Debt {
  id: string
  user_id: string
  debt_type: DebtType
  lender: string
  principal_amount: number
  interest_rate: number
  remaining_balance: number
  monthly_payment: number
  start_date: string
  end_date: string
  currency: Currency
  metadata: DebtMetadata
  created_at: string
  updated_at: string
}

export interface DebtMetadata {
  property_id?: string
  is_fixed_rate?: boolean
  early_repayment_penalty?: number
  [key: string]: unknown
}

export interface TaxEvent {
  id: string
  user_id: string
  tax_year: number
  event_type: 'capital_gain' | 'dividend' | 'interest' | 'other'
  taxable_amount: number
  tax_rate: number
  tax_owed: number
  asset_id: string | null
  event_date: string
  notes: string | null
  created_at: string
}

export interface PriceHistory {
  id: string
  symbol: string
  asset_type: AssetType
  price: number
  recorded_at: string
  source: string
  metadata: Record<string, unknown>
}

// Frontend-only types (not in DB)

export interface PortfolioSummary {
  total_value: number
  total_cost: number
  total_gain: number
  total_gain_percent: number
  daily_change: number
  daily_change_percent: number
  asset_allocation: AssetAllocation[]
  top_performers: Asset[]
  worst_performers: Asset[]
}

export interface AssetAllocation {
  asset_type: AssetType
  value: number
  percentage: number
  count: number
}

export interface PerformanceMetrics {
  roi: number
  cagr: number
  sharpe_ratio: number
  sortino_ratio: number
  max_drawdown: number
  volatility: number
  alpha: number
  beta: number
}

export interface HistoricalDataPoint {
  date: string
  value: number
  change?: number
  change_percent?: number
}

export interface TaxSummary {
  tax_year: number
  total_capital_gains: number
  total_dividends: number
  total_interest: number
  total_tax_owed: number
  events: TaxEvent[]
}

// API Response types

export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  metadata?: {
    timestamp: string
    request_id: string
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    page_size: number
    total_items: number
    total_pages: number
  }
}

// External API types

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  change_percent: number
  volume: number
  market_cap: number
  pe_ratio: number | null
  dividend_yield: number | null
  timestamp: string
}

export interface CryptoQuote {
  id: string
  symbol: string
  name: string
  price: number
  price_change_24h: number
  price_change_percent_24h: number
  market_cap: number
  volume_24h: number
  circulating_supply: number
  timestamp: string
}

export interface MetalQuote {
  metal: 'gold' | 'silver' | 'platinum' | 'palladium'
  price_per_oz: number
  price_per_gram: number
  currency: Currency
  timestamp: string
}

// Form types (for React Hook Form)

export interface AssetFormData {
  portfolio_id: string
  asset_type: AssetType
  symbol?: string
  name: string
  quantity: number
  purchase_price: number
  purchase_date: string
  metadata?: Partial<AssetMetadata>
}

export interface TransactionFormData {
  asset_id: string
  transaction_type: TransactionType
  quantity: number
  price: number
  fees: number
  transaction_date: string
  notes?: string
}

export interface DebtFormData {
  debt_type: DebtType
  lender: string
  principal_amount: number
  interest_rate: number
  monthly_payment: number
  start_date: string
  end_date: string
  currency: Currency
  metadata?: Partial<DebtMetadata>
}

// Dashboard / Chart types

export type TimeRange = '1D' | '1W' | '1M' | 'YTD' | '1Y' | 'MAX'

export type AllocationBreakdown = 'type' | 'sector' | 'country'

export interface PerformanceData {
  capital: number
  invested_capital: number
  price_gain: number
  dividends: number
  realized_gain: number
  transaction_costs: number
  taxes: number
  running_costs: number
  total_return: number
  total_return_percent: number
  irr: number
  twrr: number
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface CashFlowByYear {
  year: number
  received: number
  forecasted: number
  byType: Record<CashFlowType, number>
}

// Utility types

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  key: string
  direction: SortDirection
}

export interface FilterConfig {
  asset_type?: AssetType[]
  date_range?: {
    start: string
    end: string
  }
  min_value?: number
  max_value?: number
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area'
  data: unknown[]
  options?: Record<string, unknown>
}

// Auth types

export interface AuthUser {
  id: string
  email: string
  profile: Profile | null
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: AuthUser
}
