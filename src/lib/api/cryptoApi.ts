// src/lib/api/cryptoApi.ts

import axios from 'axios'
import type { CryptoQuote } from '@/types'

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3'

interface CoinGeckoMarketData {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_24h: number
  price_change_percentage_24h: number
  market_cap: number
  total_volume: number
  circulating_supply: number
}

export class CryptoApiClient {
  private cache: Map<string, { data: CryptoQuote; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 120000 // 2 minutes (crypto prices change fast)

  // Map common symbols to CoinGecko IDs
  private readonly SYMBOL_TO_ID: Record<string, string> = {
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

  async getQuote(symbol: string): Promise<CryptoQuote> {
    const normalizedSymbol = symbol.toUpperCase()
    
    // Check cache
    const cached = this.cache.get(normalizedSymbol)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    try {
      const coinId = this.SYMBOL_TO_ID[normalizedSymbol] || symbol.toLowerCase()
      const quote = await this.fetchFromCoinGecko(coinId, normalizedSymbol)
      
      this.cache.set(normalizedSymbol, {
        data: quote,
        timestamp: Date.now(),
      })
      
      return quote
    } catch (error) {
      console.error(`Error fetching crypto quote for ${symbol}:`, error)
      throw new Error(`Failed to fetch crypto quote for ${symbol}`)
    }
  }

  private async fetchFromCoinGecko(coinId: string, symbol: string): Promise<CryptoQuote> {
    const response = await axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
      params: {
        vs_currency: 'eur',
        ids: coinId,
        order: 'market_cap_desc',
        per_page: 1,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      },
    })

    const data = response.data[0] as CoinGeckoMarketData | undefined
    
    if (!data) {
      throw new Error(`Crypto ${coinId} not found`)
    }

    return {
      id: data.id,
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      price: data.current_price,
      price_change_24h: data.price_change_24h,
      price_change_percent_24h: data.price_change_percentage_24h,
      market_cap: data.market_cap,
      volume_24h: data.total_volume,
      circulating_supply: data.circulating_supply,
      timestamp: new Date().toISOString(),
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<Map<string, CryptoQuote>> {
    const quotes = new Map<string, CryptoQuote>()
    
    try {
      // CoinGecko allows multiple IDs in one request
      const coinIds = symbols.map(symbol => 
        this.SYMBOL_TO_ID[symbol.toUpperCase()] || symbol.toLowerCase()
      )
      
      const response = await axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
        params: {
          vs_currency: 'eur',
          ids: coinIds.join(','),
          order: 'market_cap_desc',
          per_page: symbols.length,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h',
        },
      })

      const data = response.data as CoinGeckoMarketData[]
      
      data.forEach(coin => {
        const quote: CryptoQuote = {
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          price_change_24h: coin.price_change_24h,
          price_change_percent_24h: coin.price_change_percentage_24h,
          market_cap: coin.market_cap,
          volume_24h: coin.total_volume,
          circulating_supply: coin.circulating_supply,
          timestamp: new Date().toISOString(),
        }
        
        quotes.set(coin.symbol.toUpperCase(), quote)
        
        // Also cache individually
        this.cache.set(coin.symbol.toUpperCase(), {
          data: quote,
          timestamp: Date.now(),
        })
      })
    } catch (error) {
      console.error('Error fetching batch crypto quotes:', error)
    }
    
    return quotes
  }

  async searchCoin(query: string): Promise<Array<{ id: string; symbol: string; name: string }>> {
    try {
      const response = await axios.get(`${COINGECKO_BASE_URL}/search`, {
        params: { query },
      })

      return response.data.coins.slice(0, 10).map((coin: { id: string; symbol: string; name: string }) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
      }))
    } catch (error) {
      console.error('Error searching coins:', error)
      return []
    }
  }

  async getHistoricalData(
    symbol: string,
    days: number = 30
  ): Promise<Array<{ date: string; price: number }>> {
    try {
      const coinId = this.SYMBOL_TO_ID[symbol.toUpperCase()] || symbol.toLowerCase()
      
      const response = await axios.get(`${COINGECKO_BASE_URL}/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'eur',
          days,
        },
      })

      return response.data.prices.map(([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp).toISOString(),
        price,
      }))
    } catch (error) {
      console.error('Error fetching historical data:', error)
      return []
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const cryptoApi = new CryptoApiClient()
