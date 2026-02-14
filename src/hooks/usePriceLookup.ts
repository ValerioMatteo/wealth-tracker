// src/hooks/usePriceLookup.ts
// Hook React con debounce per il lookup automatico dei prezzi via Edge Function

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { AssetType, Currency } from '@/types'

export interface PriceLookupResult {
  price: number
  name?: string
  source: string
  currency?: string
}

interface UsePriceLookupReturn {
  result: PriceLookupResult | null
  isLoading: boolean
  error: string | null
}

const QUOTABLE_TYPES: AssetType[] = ['stock', 'bond', 'etf', 'crypto', 'commodity']
const AI_VALUABLE_TYPES: AssetType[] = ['real_estate', 'luxury']

export function isQuotableAsset(assetType: AssetType): boolean {
  return QUOTABLE_TYPES.includes(assetType)
}

export function isAiValuableAsset(assetType: AssetType): boolean {
  return AI_VALUABLE_TYPES.includes(assetType)
}

export function usePriceLookup(
  symbol: string,
  assetType: AssetType,
  currency: Currency = 'EUR',
  debounceMs: number = 800
): UsePriceLookupReturn {
  const [result, setResult] = useState<PriceLookupResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef(false)

  useEffect(() => {
    // Clear timeout precedente
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    // Reset stato
    setResult(null)
    setError(null)

    // Non cercare se il simbolo e' troppo corto o il tipo non supporta pricing
    if (!symbol || symbol.length < 2 || !isQuotableAsset(assetType)) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    abortRef.current = false

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await supabase.functions.invoke('get-price', {
          body: { symbol, asset_type: assetType, currency },
        })

        if (!abortRef.current) {
          if (response.error) {
            setError('Prezzo non trovato')
            setIsLoading(false)
            return
          }

          const data = response.data as PriceLookupResult | null
          if (data && data.price) {
            setResult(data)
            setError(null)
          } else {
            setError('Prezzo non trovato')
          }
          setIsLoading(false)
        }
      } catch {
        if (!abortRef.current) {
          setError('Errore nella ricerca del prezzo')
          setIsLoading(false)
        }
      }
    }, debounceMs)

    return () => {
      abortRef.current = true
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [symbol, assetType, currency, debounceMs])

  return { result, isLoading, error }
}
