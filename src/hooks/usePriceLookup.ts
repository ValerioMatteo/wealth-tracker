// src/hooks/usePriceLookup.ts
// Hook React con debounce per il lookup automatico dei prezzi

import { useState, useEffect, useRef } from 'react'
import { lookupPrice, isQuotableAsset, type PriceLookupResult } from '@/lib/api/priceLookup'
import type { AssetType, Currency } from '@/types'

interface UsePriceLookupReturn {
  result: PriceLookupResult | null
  isLoading: boolean
  error: string | null
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
        const data = await lookupPrice(symbol, assetType, currency)
        if (!abortRef.current) {
          if (data) {
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
