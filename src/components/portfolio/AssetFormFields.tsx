import { useEffect, useRef } from 'react'
import type { AssetType, AssetMetadata } from '@/types'
import { usePriceLookup } from '@/hooks/usePriceLookup'

interface AssetFormState {
  asset_type: AssetType
  symbol: string
  name: string
  quantity: number
  purchase_price: number
  purchase_date: string
  current_price: number
  metadata: Partial<AssetMetadata>
}

interface AssetFormFieldsProps {
  form: AssetFormState
  onChange: (form: AssetFormState) => void
}

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'stock', label: 'Azione' },
  { value: 'bond', label: 'Obbligazione' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'real_estate', label: 'Immobile' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'cash', label: 'Liquidita' },
]

const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none'
const labelClass = 'mb-1 block text-sm font-medium text-foreground'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  )
}

export function AssetFormFields({ form, onChange }: AssetFormFieldsProps) {
  const t = form.asset_type
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const formRef = useRef(form)
  formRef.current = form

  // Auto-lookup prezzo quando l'utente inserisce un simbolo
  const { result: priceResult, isLoading: isPriceLooking, error: priceError } = usePriceLookup(
    form.symbol,
    form.asset_type
  )

  // Auto-fill prezzo e nome quando il lookup ha successo
  useEffect(() => {
    if (priceResult && priceResult.price > 0) {
      const updates: Partial<AssetFormState> = { current_price: priceResult.price }
      if (!formRef.current.name && priceResult.name) {
        updates.name = priceResult.name
      }
      onChangeRef.current({ ...formRef.current, ...updates })
    }
  }, [priceResult])

  const showSymbol = ['stock', 'bond', 'etf', 'crypto'].includes(t)
  const showISIN = ['stock', 'bond', 'etf'].includes(t)
  const showQuantity = ['stock', 'bond', 'etf', 'crypto', 'commodity'].includes(t)
  const showPrices = t !== 'cash'
  const showDate = t !== 'cash'
  const showSector = ['stock', 'etf'].includes(t)
  const showCountry = ['stock', 'bond', 'etf', 'real_estate'].includes(t)
  const showExchange = ['stock', 'bond', 'etf'].includes(t)
  const showBlockchain = t === 'crypto'
  const showWallet = t === 'crypto'
  const showAddress = t === 'real_estate'
  const showPropertyType = t === 'real_estate'
  const showSizeSqm = t === 'real_estate'
  const showBrand = t === 'luxury'
  const showModel = t === 'luxury'
  const showAppraisalDate = t === 'luxury'
  const showWeight = t === 'commodity'
  const showPurity = t === 'commodity'
  const showCashAmount = t === 'cash'
  const showStorageLocation = ['commodity', 'cash'].includes(t)

  const setMeta = (key: string, value: unknown) => {
    onChange({ ...form, metadata: { ...form.metadata, [key]: value } })
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Type + Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo *">
          <select
            value={form.asset_type}
            onChange={e => onChange({ ...form, asset_type: e.target.value as AssetType, metadata: {} })}
            className={inputClass}
          >
            {ASSET_TYPES.map(at => <option key={at.value} value={at.value}>{at.label}</option>)}
          </select>
        </Field>
        <Field label="Nome *">
          <input
            type="text"
            value={form.name}
            onChange={e => onChange({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder={t === 'real_estate' ? 'Es. Appartamento Milano' : t === 'luxury' ? 'Es. Rolex Daytona' : 'Es. Apple Inc.'}
            required
          />
        </Field>
      </div>

      {/* Row 2: Symbol / ISIN */}
      {(showSymbol || showISIN) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {showSymbol && (
            <Field label={t === 'crypto' ? 'Simbolo / Ticker' : 'Simbolo / Ticker'}>
              <div className="relative">
                <input
                  type="text"
                  value={form.symbol}
                  onChange={e => onChange({ ...form, symbol: e.target.value.toUpperCase() })}
                  className={inputClass}
                  placeholder={t === 'crypto' ? 'Es. BTC, ETH' : 'Es. AAPL, VWCE.DE'}
                />
                {isPriceLooking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
                  </div>
                )}
              </div>
              {priceResult && (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                  Prezzo da {priceResult.source}: {priceResult.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </p>
              )}
              {priceError && !isPriceLooking && form.symbol.length >= 2 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{priceError}</p>
              )}
            </Field>
          )}
          {showISIN && (
            <Field label="ISIN">
              <input
                type="text"
                value={(form.metadata?.isin as string) || ''}
                onChange={e => setMeta('isin', e.target.value.toUpperCase())}
                className={inputClass}
                placeholder="Es. US0378331005"
              />
            </Field>
          )}
        </div>
      )}

      {/* Row 3: Quantity / Prices / Date */}
      <div className={`grid gap-4 ${showQuantity && showPrices ? 'sm:grid-cols-2 lg:grid-cols-4' : showPrices ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {showQuantity && (
          <Field label={t === 'commodity' ? 'Peso (grammi)' : 'Quantita *'}>
            <input
              type="number"
              step="any"
              value={form.quantity || ''}
              onChange={e => onChange({ ...form, quantity: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              required={t !== 'commodity'}
            />
          </Field>
        )}
        {showPrices && (
          <>
            <Field label={t === 'real_estate' ? 'Prezzo Acquisto (€)' : 'Prezzo Acquisto (€) *'}>
              <input
                type="number"
                step="any"
                value={form.purchase_price || ''}
                onChange={e => onChange({ ...form, purchase_price: parseFloat(e.target.value) || 0 })}
                className={inputClass}
                required
              />
            </Field>
            <Field label={t === 'real_estate' ? 'Valore Attuale (€)' : 'Prezzo Attuale (€)'}>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={form.current_price || ''}
                  onChange={e => onChange({ ...form, current_price: parseFloat(e.target.value) || 0 })}
                  className={`${inputClass} ${priceResult ? 'border-emerald-400 dark:border-emerald-600' : ''}`}
                />
                {priceResult && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                    AUTO
                  </span>
                )}
              </div>
            </Field>
          </>
        )}
        {showDate && (
          <Field label="Data Acquisto">
            <input
              type="date"
              value={form.purchase_date}
              onChange={e => onChange({ ...form, purchase_date: e.target.value })}
              className={inputClass}
            />
          </Field>
        )}
      </div>

      {/* Cash-specific fields */}
      {showCashAmount && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Importo (€) *">
            <input
              type="number"
              step="any"
              value={form.purchase_price || ''}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0
                onChange({ ...form, purchase_price: val, current_price: val, quantity: 1 })
              }}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Valuta">
            <select
              value={(form.metadata?.currency as string) || 'EUR'}
              onChange={e => setMeta('currency', e.target.value)}
              className={inputClass}
            >
              {['EUR', 'USD', 'GBP', 'CHF', 'JPY'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      )}

      {/* Sector / Country / Exchange */}
      {(showSector || showCountry || showExchange) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {showSector && (
            <Field label="Settore">
              <input
                type="text"
                value={(form.metadata?.sector as string) || ''}
                onChange={e => setMeta('sector', e.target.value)}
                className={inputClass}
                placeholder="Es. Technology"
              />
            </Field>
          )}
          {showCountry && (
            <Field label="Paese">
              <input
                type="text"
                value={(form.metadata?.country as string) || ''}
                onChange={e => setMeta('country', e.target.value)}
                className={inputClass}
                placeholder="Es. USA, Italia"
              />
            </Field>
          )}
          {showExchange && (
            <Field label="Borsa">
              <input
                type="text"
                value={(form.metadata?.exchange as string) || ''}
                onChange={e => setMeta('exchange', e.target.value)}
                className={inputClass}
                placeholder="Es. NASDAQ, Borsa Italiana"
              />
            </Field>
          )}
        </div>
      )}

      {/* Crypto-specific */}
      {(showBlockchain || showWallet) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {showBlockchain && (
            <Field label="Blockchain">
              <input
                type="text"
                value={(form.metadata?.blockchain as string) || ''}
                onChange={e => setMeta('blockchain', e.target.value)}
                className={inputClass}
                placeholder="Es. Ethereum, Bitcoin"
              />
            </Field>
          )}
          {showWallet && (
            <Field label="Indirizzo Wallet">
              <input
                type="text"
                value={(form.metadata?.wallet_address as string) || ''}
                onChange={e => setMeta('wallet_address', e.target.value)}
                className={inputClass}
                placeholder="0x..."
              />
            </Field>
          )}
        </div>
      )}

      {/* Real estate-specific */}
      {(showAddress || showPropertyType || showSizeSqm) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {showAddress && (
            <Field label="Indirizzo">
              <input
                type="text"
                value={(form.metadata?.address as string) || ''}
                onChange={e => setMeta('address', e.target.value)}
                className={inputClass}
                placeholder="Via Roma 1, Milano"
              />
            </Field>
          )}
          {showPropertyType && (
            <Field label="Tipo Proprieta">
              <select
                value={(form.metadata?.property_type as string) || 'residential'}
                onChange={e => setMeta('property_type', e.target.value)}
                className={inputClass}
              >
                <option value="residential">Residenziale</option>
                <option value="commercial">Commerciale</option>
                <option value="land">Terreno</option>
              </select>
            </Field>
          )}
          {showSizeSqm && (
            <Field label="Superficie (mq)">
              <input
                type="number"
                step="any"
                value={(form.metadata?.size_sqm as number) || ''}
                onChange={e => setMeta('size_sqm', parseFloat(e.target.value) || 0)}
                className={inputClass}
                placeholder="Es. 85"
              />
            </Field>
          )}
        </div>
      )}

      {/* Luxury-specific */}
      {(showBrand || showModel || showAppraisalDate) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {showBrand && (
            <Field label="Brand">
              <input
                type="text"
                value={(form.metadata?.brand as string) || ''}
                onChange={e => setMeta('brand', e.target.value)}
                className={inputClass}
                placeholder="Es. Rolex, Hermes"
              />
            </Field>
          )}
          {showModel && (
            <Field label="Modello">
              <input
                type="text"
                value={(form.metadata?.model as string) || ''}
                onChange={e => setMeta('model', e.target.value)}
                className={inputClass}
                placeholder="Es. Daytona, Birkin"
              />
            </Field>
          )}
          {showAppraisalDate && (
            <Field label="Data Perizia">
              <input
                type="date"
                value={(form.metadata?.appraisal_date as string) || ''}
                onChange={e => setMeta('appraisal_date', e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
        </div>
      )}

      {/* Commodity-specific */}
      {(showWeight || showPurity) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {showPurity && (
            <Field label="Purezza (%)">
              <input
                type="number"
                step="any"
                value={(form.metadata?.purity as number) || ''}
                onChange={e => setMeta('purity', parseFloat(e.target.value) || 0)}
                className={inputClass}
                placeholder="Es. 99.9"
              />
            </Field>
          )}
        </div>
      )}

      {/* Storage location */}
      {showStorageLocation && (
        <Field label="Ubicazione / Custodia">
          <input
            type="text"
            value={(form.metadata?.storage_location as string) || ''}
            onChange={e => setMeta('storage_location', e.target.value)}
            className={inputClass}
            placeholder={t === 'cash' ? 'Es. Conto Deposito Banca Intesa' : 'Es. Cassaforte, Deposito bancario'}
          />
        </Field>
      )}
    </div>
  )
}

export type { AssetFormState }
