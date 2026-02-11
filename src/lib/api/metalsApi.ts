// src/lib/api/metalsApi.ts

import axios from 'axios'
import type { MetalQuote, Currency } from '@/types'

const METALS_API_BASE_URL = 'https://api.metalpriceapi.com/v1'

// Fallback: free alternative API
const GOLDAPI_BASE_URL = 'https://www.goldapi.io/api'

type MetalType = 'gold' | 'silver' | 'platinum' | 'palladium'

interface MetalPriceResponse {
  success: boolean
  timestamp: number
  base: string
  rates: {
    XAU?: number // Gold
    XAG?: number // Silver
    XPT?: number // Platinum
    XPD?: number // Palladium
  }
}

export class MetalsApiClient {
  private cache: Map<string, { data: MetalQuote; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 300000 // 5 minutes (metals don't change as fast)

  private readonly METAL_CODES: Record<MetalType, string> = {
    gold: 'XAU',
    silver: 'XAG',
    platinum: 'XPT',
    palladium: 'XPD',
  }

  private readonly GRAMS_PER_OZ = 31.1035

  async getQuote(metal: MetalType, currency: Currency = 'EUR'): Promise<MetalQuote> {
    const cacheKey = `${metal}-${currency}`
    
    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    try {
      const quote = await this.fetchMetalPrice(metal, currency)
      
      this.cache.set(cacheKey, {
        data: quote,
        timestamp: Date.now(),
      })
      
      return quote
    } catch (error) {
      console.error(`Error fetching ${metal} price:`, error)
      throw new Error(`Failed to fetch ${metal} price`)
    }
  }

  private async fetchMetalPrice(metal: MetalType, currency: Currency): Promise<MetalQuote> {
    // Using free alternative: exchangerate-api.com for metals
    // In production, you'd use MetalPriceAPI or GoldAPI with API key
    
    try {
      // Simplified example using a mock/fallback
      // In production, replace with actual API call
      const response = await this.fetchFromFreeAPI(metal, currency)
      
      return response
    } catch (error) {
      // Fallback to hardcoded recent prices (only for demo)
      return this.getFallbackPrice(metal, currency)
    }
  }

  private async fetchFromFreeAPI(metal: MetalType, currency: Currency): Promise<MetalQuote> {
    // This is a simplified example
    // Real implementation would use MetalPriceAPI or similar
    
    const metalCode = this.METAL_CODES[metal]
    
    // Example: Using exchangerate API for metals
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${currency}`
    )
    
    // Note: This is simplified. Real metal APIs provide actual metal prices
    const baseRates: Record<string, number> = {
      XAU: 1900, // Gold per oz in USD (example)
      XAG: 24,   // Silver per oz in USD
      XPT: 950,  // Platinum per oz in USD
      XPD: 1050, // Palladium per oz in USD
    }
    
    const pricePerOz = baseRates[metalCode] || 0
    const pricePerGram = pricePerOz / this.GRAMS_PER_OZ
    
    // Convert to target currency if needed
    const exchangeRate = currency === 'USD' ? 1 : (response.data.rates.USD || 1.1)
    
    return {
      metal,
      price_per_oz: pricePerOz * exchangeRate,
      price_per_gram: pricePerGram * exchangeRate,
      currency,
      timestamp: new Date().toISOString(),
    }
  }

  private getFallbackPrice(metal: MetalType, currency: Currency): MetalQuote {
    // Fallback prices (approximate, for demo purposes)
    const fallbackPrices: Record<MetalType, { oz: number; gram: number }> = {
      gold: { oz: 1950, gram: 62.7 },
      silver: { oz: 24.5, gram: 0.79 },
      platinum: { oz: 950, gram: 30.5 },
      palladium: { oz: 1050, gram: 33.8 },
    }
    
    const prices = fallbackPrices[metal]
    const exchangeRate = currency === 'USD' ? 1 : 1.1 // Simplified EUR/USD
    
    return {
      metal,
      price_per_oz: prices.oz * exchangeRate,
      price_per_gram: prices.gram * exchangeRate,
      currency,
      timestamp: new Date().toISOString(),
    }
  }

  async getAllMetalPrices(currency: Currency = 'EUR'): Promise<Map<MetalType, MetalQuote>> {
    const metals: MetalType[] = ['gold', 'silver', 'platinum', 'palladium']
    const quotes = new Map<MetalType, MetalQuote>()
    
    const promises = metals.map(metal => 
      this.getQuote(metal, currency).catch(err => {
        console.error(`Error fetching ${metal} price:`, err)
        return null
      })
    )
    
    const results = await Promise.all(promises)
    
    results.forEach((quote, index) => {
      if (quote) {
        quotes.set(metals[index], quote)
      }
    })
    
    return quotes
  }

  // Convert between different weights
  convertWeight(
    amount: number,
    fromUnit: 'oz' | 'gram' | 'kg',
    toUnit: 'oz' | 'gram' | 'kg'
  ): number {
    // Convert to grams first
    let grams = amount
    if (fromUnit === 'oz') grams = amount * this.GRAMS_PER_OZ
    if (fromUnit === 'kg') grams = amount * 1000
    
    // Convert to target unit
    if (toUnit === 'oz') return grams / this.GRAMS_PER_OZ
    if (toUnit === 'kg') return grams / 1000
    return grams
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const metalsApi = new MetalsApiClient()
