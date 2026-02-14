// src/lib/api/metalsApi.ts
// Metalli preziosi via Yahoo Finance Futures (gratis, senza API key)

import { stockApi } from './stockApi'
import type { MetalQuote, Currency } from '@/types'

type MetalType = 'gold' | 'silver' | 'platinum' | 'palladium'

// Yahoo Finance futures symbols per metalli preziosi
const YAHOO_FUTURES_SYMBOLS: Record<MetalType, string> = {
  gold: 'GC=F',      // COMEX Gold Futures
  silver: 'SI=F',    // COMEX Silver Futures
  platinum: 'PL=F',  // NYMEX Platinum Futures
  palladium: 'PA=F', // NYMEX Palladium Futures
}

// Mappatura da simboli comuni a MetalType
const SYMBOL_TO_METAL: Record<string, MetalType> = {
  'GOLD': 'gold',
  'XAU': 'gold',
  'SILVER': 'silver',
  'XAG': 'silver',
  'PLATINUM': 'platinum',
  'XPT': 'platinum',
  'PALLADIUM': 'palladium',
  'XPD': 'palladium',
}

const GRAMS_PER_OZ = 31.1035

export class MetalsApiClient {
  private cache: Map<string, { data: MetalQuote; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 300000 // 5 minuti

  async getQuote(metal: MetalType, currency: Currency = 'EUR'): Promise<MetalQuote> {
    const cacheKey = `${metal}-${currency}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    const yahooSymbol = YAHOO_FUTURES_SYMBOLS[metal]
    const stockQuote = await stockApi.getQuote(yahooSymbol)

    // Yahoo Finance restituisce prezzi in USD per i futures
    let pricePerOz = stockQuote.price

    if (currency !== 'USD') {
      try {
        // Fetch tasso di cambio USD -> target currency via Yahoo Finance
        const fxQuote = await stockApi.getQuote(`${currency}=X`)
        // ${currency}=X restituisce quanto vale 1 USD nella valuta target
        pricePerOz = stockQuote.price * fxQuote.price
      } catch {
        // Fallback: tasso approssimativo EUR/USD
        const fallbackRates: Record<string, number> = {
          EUR: 0.92, GBP: 0.79, CHF: 0.88, JPY: 149.5,
        }
        pricePerOz = stockQuote.price * (fallbackRates[currency] || 1)
      }
    }

    const quote: MetalQuote = {
      metal,
      price_per_oz: Math.round(pricePerOz * 100) / 100,
      price_per_gram: Math.round((pricePerOz / GRAMS_PER_OZ) * 100) / 100,
      currency,
      timestamp: stockQuote.timestamp,
    }

    this.cache.set(cacheKey, { data: quote, timestamp: Date.now() })
    return quote
  }

  /**
   * Risolve un simbolo comune (GOLD, XAU, SILVER, ecc.) al MetalType corrispondente
   */
  resolveMetalType(symbol: string): MetalType | null {
    return SYMBOL_TO_METAL[symbol.toUpperCase()] || null
  }

  /**
   * Ottiene il simbolo Yahoo Finance futures per un metallo
   */
  getYahooSymbol(metal: MetalType): string {
    return YAHOO_FUTURES_SYMBOLS[metal]
  }

  async getAllMetalPrices(currency: Currency = 'EUR'): Promise<Map<MetalType, MetalQuote>> {
    const metals: MetalType[] = ['gold', 'silver', 'platinum', 'palladium']
    const quotes = new Map<MetalType, MetalQuote>()

    const results = await Promise.all(
      metals.map(m => this.getQuote(m, currency).catch(() => null))
    )
    results.forEach((q, i) => { if (q) quotes.set(metals[i]!, q) })
    return quotes
  }

  convertWeight(
    amount: number,
    fromUnit: 'oz' | 'gram' | 'kg',
    toUnit: 'oz' | 'gram' | 'kg'
  ): number {
    let grams = amount
    if (fromUnit === 'oz') grams = amount * GRAMS_PER_OZ
    if (fromUnit === 'kg') grams = amount * 1000
    if (toUnit === 'oz') return grams / GRAMS_PER_OZ
    if (toUnit === 'kg') return grams / 1000
    return grams
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const metalsApi = new MetalsApiClient()
