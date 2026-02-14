// src/lib/api/priceLookup.ts
// Servizio unificato per il lookup prezzi di tutti gli asset quotati

import { stockApi } from './stockApi'
import { cryptoApi } from './cryptoApi'
import type { AssetType, Currency } from '@/types'

export interface PriceLookupResult {
  price: number
  name?: string
  source: string
  timestamp: string
}

// Simboli metalli -> Yahoo Finance futures
const METAL_SYMBOLS: Record<string, string> = {
  'GOLD': 'GC=F',
  'SILVER': 'SI=F',
  'PLATINUM': 'PL=F',
  'PALLADIUM': 'PA=F',
  'XAU': 'GC=F',
  'XAG': 'SI=F',
  'XPT': 'PL=F',
  'XPD': 'PA=F',
}

/**
 * Cerca il prezzo corrente di un asset basandosi su tipo e simbolo.
 * Instrada la richiesta all'API client corretto.
 */
export async function lookupPrice(
  symbol: string,
  assetType: AssetType,
  currency: Currency = 'EUR'
): Promise<PriceLookupResult | null> {
  if (!symbol || symbol.trim().length < 1) return null

  try {
    switch (assetType) {
      case 'stock':
      case 'etf': {
        const quote = await stockApi.getQuote(symbol)
        return {
          price: quote.price,
          name: quote.name,
          source: 'Yahoo Finance',
          timestamp: quote.timestamp,
        }
      }

      case 'bond': {
        // Prova prima il simbolo diretto, poi con suffissi di borsa
        const quote = await lookupBondPrice(symbol)
        if (quote) return quote
        return null
      }

      case 'crypto': {
        const quote = await cryptoApi.getQuote(symbol)
        return {
          price: quote.price,
          name: quote.name,
          source: 'CoinGecko',
          timestamp: quote.timestamp,
        }
      }

      case 'commodity': {
        // Metalli preziosi via Yahoo Finance futures
        const yahooSymbol = METAL_SYMBOLS[symbol.toUpperCase()]
        if (yahooSymbol) {
          const quote = await stockApi.getQuote(yahooSymbol)
          // I futures sono in USD, converti se necessario
          let price = quote.price
          if (currency !== 'USD') {
            try {
              const fx = await stockApi.getQuote(`${currency}=X`)
              price = quote.price * fx.price
            } catch {
              // Fallback rate
              price = quote.price * 0.92
            }
          }
          return {
            price: Math.round(price * 100) / 100,
            name: quote.name,
            source: 'Yahoo Finance',
            timestamp: quote.timestamp,
          }
        }
        return null
      }

      default:
        // real_estate, luxury, cash non hanno pricing automatico
        return null
    }
  } catch (error) {
    console.error(`Price lookup failed for ${symbol} (${assetType}):`, error)
    return null
  }
}

/**
 * Lookup prezzo obbligazioni: prova ISIN diretto e con suffissi di borsa
 */
async function lookupBondPrice(symbol: string): Promise<PriceLookupResult | null> {
  // Prova il simbolo diretto
  try {
    const quote = await stockApi.getQuote(symbol)
    return {
      price: quote.price,
      name: quote.name,
      source: 'Yahoo Finance',
      timestamp: quote.timestamp,
    }
  } catch {
    // Ignora e prova con suffissi
  }

  // Suffissi borse europee (priorita' italiana)
  const suffixes = ['.MI', '.F', '.DE', '.L', '.PA', '.AS']
  for (const suffix of suffixes) {
    try {
      const quote = await stockApi.getQuote(symbol + suffix)
      return {
        price: quote.price,
        name: quote.name,
        source: `Yahoo Finance (${suffix.replace('.', '')})`,
        timestamp: quote.timestamp,
      }
    } catch {
      continue
    }
  }

  return null
}

/**
 * Verifica se un tipo di asset supporta il pricing automatico
 */
export function isQuotableAsset(assetType: AssetType): boolean {
  return ['stock', 'etf', 'bond', 'crypto', 'commodity'].includes(assetType)
}

/**
 * Verifica se un tipo di asset supporta la valutazione AI
 */
export function isAiValuableAsset(assetType: AssetType): boolean {
  return ['real_estate', 'luxury'].includes(assetType)
}
