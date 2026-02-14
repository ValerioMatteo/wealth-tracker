// src/lib/api/stockApi.ts

import axios from 'axios'
import type { StockQuote } from '@/types'

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'
const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

// NOTA: Le API keys NON devono essere esposte nel frontend
// Queste chiamate dovrebbero passare attraverso Supabase Edge Functions
// per proteggere le chiavi API

interface AlphaVantageQuote {
  '01. symbol': string
  '02. open': string
  '03. high': string
  '04. low': string
  '05. price': string
  '06. volume': string
  '07. latest trading day': string
  '08. previous close': string
  '09. change': string
  '10. change percent': string
}

export class StockApiClient {
  private cache: Map<string, { data: StockQuote; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 60000 // 1 minute

  async getQuote(symbol: string): Promise<StockQuote> {
    // Check cache first
    const cached = this.cache.get(symbol)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    try {
      // Try Yahoo Finance first (free, no API key needed)
      const quote = await this.fetchFromYahoo(symbol)
      
      // Cache the result
      this.cache.set(symbol, {
        data: quote,
        timestamp: Date.now(),
      })
      
      return quote
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)
      throw new Error(`Failed to fetch quote for ${symbol}`)
    }
  }

  private async fetchFromYahoo(symbol: string): Promise<StockQuote> {
    const response = await axios.get(`${YAHOO_FINANCE_BASE_URL}/${symbol}`, {
      params: {
        interval: '1d',
        range: '1d',
      },
    })

    const result = response.data.chart.result[0]
    const quote = result.meta
    const indicators = result.indicators.quote[0]

    const currentPrice = quote.regularMarketPrice
    const previousClose = quote.previousClose
    const change = currentPrice - previousClose
    const changePercent = (change / previousClose) * 100

    return {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || symbol,
      price: currentPrice,
      change,
      change_percent: changePercent,
      volume: indicators.volume[indicators.volume.length - 1],
      market_cap: quote.marketCap || 0,
      pe_ratio: quote.trailingPE || null,
      dividend_yield: quote.dividendYield ? quote.dividendYield * 100 : null,
      timestamp: new Date(quote.regularMarketTime * 1000).toISOString(),
    }
  }

  // Fallback to Alpha Vantage (requires API key)
  private async fetchFromAlphaVantage(symbol: string, apiKey: string): Promise<StockQuote> {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: apiKey,
      },
    })

    const quote = response.data['Global Quote'] as AlphaVantageQuote
    
    if (!quote || !quote['01. symbol']) {
      throw new Error('Invalid response from Alpha Vantage')
    }

    const price = parseFloat(quote['05. price'])
    const change = parseFloat(quote['09. change'])
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''))

    return {
      symbol: quote['01. symbol'],
      name: symbol, // Alpha Vantage doesn't provide company name in this endpoint
      price,
      change,
      change_percent: changePercent,
      volume: parseInt(quote['06. volume']),
      market_cap: 0, // Not provided by this endpoint
      pe_ratio: null,
      dividend_yield: null,
      timestamp: new Date(quote['07. latest trading day']).toISOString(),
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const quotes = new Map<string, StockQuote>()
    
    // Fetch in parallel with rate limiting
    const batchSize = 5
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      const promises = batch.map(symbol => 
        this.getQuote(symbol).catch(err => {
          console.error(`Error fetching ${symbol}:`, err)
          return null
        })
      )
      
      const results = await Promise.all(promises)
      results.forEach((quote, index) => {
        if (quote) {
          quotes.set(batch[index], quote)
        }
      })
      
      // Wait between batches to avoid rate limiting
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return quotes
  }

  async getHistoricalPrices(
    symbol: string,
    range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max' = '1mo'
  ): Promise<{ date: string; price: number }[]> {
    try {
      const intervalMap: Record<string, string> = {
        '1d': '5m', '5d': '15m', '1mo': '1d', '3mo': '1d',
        '6mo': '1d', '1y': '1wk', '2y': '1wk', '5y': '1mo', 'max': '1mo',
      }

      const response = await axios.get(`${YAHOO_FINANCE_BASE_URL}/${symbol}`, {
        params: { interval: intervalMap[range] || '1d', range },
      })

      const result = response.data.chart.result[0]
      const timestamps = result.timestamp || []
      const closes = result.indicators.quote[0].close || []

      return timestamps.map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        price: closes[i] ?? 0,
      })).filter((p: { price: number }) => p.price > 0)
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error)
      return []
    }
  }

  async searchByISIN(isin: string): Promise<StockQuote | null> {
    // Prova ISIN diretto (funziona per molti mercati)
    try {
      return await this.getQuote(isin)
    } catch {
      // Fallback: prova con suffissi di borsa europee
    }

    // Suffissi borse europee (priorita' italiana per BTP/BOT)
    const suffixes = ['.MI', '.F', '.DE', '.L', '.PA', '.AS']
    for (const suffix of suffixes) {
      try {
        return await this.getQuote(isin + suffix)
      } catch {
        continue
      }
    }

    console.warn(`Could not find quote for ISIN ${isin}`)
    return null
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const stockApi = new StockApiClient()
