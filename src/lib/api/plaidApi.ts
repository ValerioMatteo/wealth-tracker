// src/lib/api/plaidApi.ts
// Placeholder per futura integrazione Plaid Open Banking
// Documentazione: https://plaid.com/docs/

export interface PlaidLinkConfig {
  client_name: string
  products: ('transactions' | 'auth' | 'identity' | 'investments' | 'liabilities')[]
  country_codes: string[]
  language: string
}

export interface PlaidAccount {
  account_id: string
  name: string
  official_name: string | null
  type: 'depository' | 'credit' | 'loan' | 'investment' | 'other'
  subtype: string | null
  balances: {
    available: number | null
    current: number
    iso_currency_code: string
  }
  mask: string | null
}

export interface PlaidInvestmentHolding {
  account_id: string
  security_id: string
  quantity: number
  institution_price: number
  institution_value: number
  cost_basis: number | null
  iso_currency_code: string
}

export interface PlaidSecurity {
  security_id: string
  isin: string | null
  ticker_symbol: string | null
  name: string | null
  type: string
  close_price: number | null
  iso_currency_code: string
}

// Stub functions - da implementare con Supabase Edge Functions
// Le chiamate Plaid richiedono un backend server per sicurezza

export async function createLinkToken(): Promise<string> {
  // TODO: Chiamare Supabase Edge Function che crea il link token
  throw new Error('Plaid integration not yet configured. Set up Supabase Edge Function.')
}

export async function exchangePublicToken(_publicToken: string): Promise<string> {
  // TODO: Chiamare Supabase Edge Function che scambia il public token per access token
  throw new Error('Plaid integration not yet configured.')
}

export async function getAccounts(_accessToken: string): Promise<PlaidAccount[]> {
  // TODO: Chiamare Supabase Edge Function
  throw new Error('Plaid integration not yet configured.')
}

export async function getInvestmentHoldings(_accessToken: string): Promise<{
  accounts: PlaidAccount[]
  holdings: PlaidInvestmentHolding[]
  securities: PlaidSecurity[]
}> {
  // TODO: Chiamare Supabase Edge Function
  throw new Error('Plaid integration not yet configured.')
}

export async function syncTransactions(_accessToken: string, _cursor?: string): Promise<{
  added: unknown[]
  modified: unknown[]
  removed: unknown[]
  next_cursor: string
  has_more: boolean
}> {
  // TODO: Chiamare Supabase Edge Function
  throw new Error('Plaid integration not yet configured.')
}
