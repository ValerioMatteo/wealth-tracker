// supabase/functions/_shared/priceFetchers.ts
// Consolidated price fetching utilities for all asset types

// --- Constants ---

export const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'ADA': 'cardano',
  'XRP': 'ripple',
  'DOT': 'polkadot',
  'DOGE': 'dogecoin',
  'AVAX': 'avalanche-2',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
}

export const METAL_SYMBOL_MAP: Record<string, string> = {
  'GOLD': 'GC=F',
  'SILVER': 'SI=F',
  'PLATINUM': 'PL=F',
  'PALLADIUM': 'PA=F',
  'XAU': 'GC=F',
  'XAG': 'SI=F',
  'XPT': 'PL=F',
  'XPD': 'PA=F',
}

const BOND_EXCHANGE_SUFFIXES = ['.MI', '.F', '.DE', '.L', '.PA', '.AS']

// --- Stock / ETF ---

export interface YahooQuoteResult {
  price: number
  name?: string
  currency?: string
}

/**
 * Fetch stock/ETF price from Yahoo Finance.
 * Returns price and optional name/currency.
 */
export async function fetchStockPrice(symbol: string): Promise<YahooQuoteResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Yahoo Finance error for ${symbol}: ${response.status}`)

  const data = await response.json()
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for symbol: ${symbol}`)

  const meta = result.meta
  return {
    price: meta.regularMarketPrice,
    name: meta.shortName || meta.longName,
    currency: meta.currency,
  }
}

// --- Bonds (ISIN lookup) ---

/**
 * Fetch bond price by ISIN with European exchange suffix fallbacks.
 */
export async function fetchBondByISIN(isin: string): Promise<YahooQuoteResult | null> {
  // Try ISIN directly
  try {
    return await fetchStockPrice(isin)
  } catch {
    // Fall through to suffixes
  }

  // Try with exchange suffixes
  for (const suffix of BOND_EXCHANGE_SUFFIXES) {
    try {
      return await fetchStockPrice(isin + suffix)
    } catch {
      continue
    }
  }
  return null
}

// --- Crypto ---

export interface CryptoQuoteResult {
  price: number
  name?: string
}

/**
 * Fetch crypto price from CoinGecko (free tier, EUR).
 */
export async function fetchCryptoPrice(symbol: string, currency = 'eur'): Promise<CryptoQuoteResult> {
  const coinId = CRYPTO_SYMBOL_MAP[symbol.toUpperCase()] || symbol.toLowerCase()

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true`
  )
  if (!response.ok) throw new Error(`CoinGecko error for ${symbol}: ${response.status}`)

  const data = await response.json()
  const coinData = data[coinId]
  if (!coinData) throw new Error(`No CoinGecko data for: ${symbol} (coinId: ${coinId})`)

  return {
    price: coinData[currency],
    name: symbol.toUpperCase(),
  }
}

// --- Metals (Commodities) ---

/**
 * Fetch metal price via Yahoo Finance Futures.
 * Accepts: GOLD, SILVER, PLATINUM, PALLADIUM, XAU, XAG, XPT, XPD
 */
export async function fetchMetalPrice(metal: string): Promise<YahooQuoteResult> {
  const yahooSymbol = METAL_SYMBOL_MAP[metal.toUpperCase()]
  if (!yahooSymbol) throw new Error(`Unknown metal: ${metal}`)

  return await fetchStockPrice(yahooSymbol)
}

// --- FX Rates ---

/**
 * Fetch currency exchange rate via Yahoo Finance.
 * E.g., fetchFxRate('USD', 'EUR') returns how many EUR per 1 USD.
 */
export async function fetchFxRate(from: string, to: string): Promise<number> {
  if (from === to) return 1.0

  const symbol = `${from}${to}=X`
  const result = await fetchStockPrice(symbol)
  return result.price
}

// --- Unified price lookup ---

export interface PriceLookupResult {
  price: number
  name?: string
  source: string
  currency?: string
}

/**
 * Look up the price for any supported asset type.
 * Routes to the correct provider based on asset_type.
 */
export async function lookupPrice(
  symbol: string,
  assetType: string,
  targetCurrency = 'EUR'
): Promise<PriceLookupResult | null> {
  switch (assetType) {
    case 'stock':
    case 'etf': {
      const result = await fetchStockPrice(symbol)
      let price = result.price
      // Convert currency if needed
      if (result.currency && result.currency !== targetCurrency) {
        const rate = await fetchFxRate(result.currency, targetCurrency)
        price = price * rate
      }
      return {
        price,
        name: result.name,
        source: 'Yahoo Finance',
        currency: targetCurrency,
      }
    }

    case 'bond': {
      // Try as symbol first, then as ISIN
      let result: YahooQuoteResult | null = null
      try {
        result = await fetchStockPrice(symbol)
      } catch {
        result = await fetchBondByISIN(symbol)
      }
      if (!result) return null
      let price = result.price
      if (result.currency && result.currency !== targetCurrency) {
        const rate = await fetchFxRate(result.currency, targetCurrency)
        price = price * rate
      }
      return {
        price,
        name: result.name,
        source: 'Yahoo Finance',
        currency: targetCurrency,
      }
    }

    case 'crypto': {
      const curr = targetCurrency.toLowerCase()
      const result = await fetchCryptoPrice(symbol, curr)
      return {
        price: result.price,
        name: result.name,
        source: 'CoinGecko',
        currency: targetCurrency,
      }
    }

    case 'commodity': {
      const result = await fetchMetalPrice(symbol)
      let price = result.price
      // Metal futures are in USD, convert if needed
      if (targetCurrency !== 'USD') {
        const rate = await fetchFxRate('USD', targetCurrency)
        price = price * rate
      }
      return {
        price,
        name: result.name,
        source: 'Yahoo Finance Futures',
        currency: targetCurrency,
      }
    }

    default:
      return null
  }
}
