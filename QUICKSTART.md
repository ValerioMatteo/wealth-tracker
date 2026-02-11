# 🚀 WealthTracker - Quick Start Guide

Guida pratica per iniziare a sviluppare WealthTracker.

## 📋 Prerequisites

- Node.js 18+ installato
- Account Supabase (gratuito: https://supabase.com)
- Editor di codice (VS Code consigliato)
- Git installato

## 🏁 Setup Iniziale (15 minuti)

### 1. Clone & Install

```bash
# Clone il repository
git clone https://github.com/tuousername/wealth-tracker.git
cd wealth-tracker

# Installa le dipendenze
npm install

# Questo installerà circa 200MB di node_modules
```

### 2. Setup Supabase

#### 2.1 Crea un nuovo progetto Supabase

1. Vai su https://supabase.com
2. Click "New Project"
3. Nome progetto: "wealth-tracker"
4. Database Password: Scegli una password sicura
5. Region: Frankfurt (EU - più vicina all'Italia)
6. Click "Create new project"

⏱️ Attendi 2-3 minuti per il provisioning del database

#### 2.2 Copia le credenziali

Nel dashboard Supabase:
1. Vai su Settings > API
2. Copia:
   - **Project URL** (es: https://abcdefgh.supabase.co)
   - **anon public key** (chiave lunga che inizia con "eyJ...")

#### 2.3 Configura le variabili d'ambiente

```bash
# Copia il template
cp .env.example .env.local

# Modifica .env.local con il tuo editor
nano .env.local
```

Inserisci:
```bash
VITE_SUPABASE_URL=https://tuoprogetto.supabase.co
VITE_SUPABASE_ANON_KEY=tua_chiave_qui
```

### 3. Crea il Database Schema

Nel dashboard Supabase:
1. Vai su SQL Editor
2. Click "New Query"
3. Copia tutto il contenuto di `supabase/migrations/001_initial_schema.sql`
4. Incolla nell'editor
5. Click "Run" (▶️)

✅ Dovresti vedere "Success. No rows returned" in verde

Verifica che le tabelle siano state create:
1. Vai su Table Editor
2. Dovresti vedere: profiles, portfolios, assets, transactions, etc.

### 4. Avvia l'app

```bash
# Development server
npm run dev
```

Apri http://localhost:3000 nel browser 🎉

## 🧪 Test dell'App (First Run)

### Test 1: Registrazione

1. Click "Sign Up"
2. Email: tuo@email.com
3. Password: Test123!@# (minimo 12 caratteri)
4. Nome completo: Il Tuo Nome
5. Click "Create Account"

📧 **Importante**: Controlla la tua email per il link di conferma!

Nel email di Supabase, click "Confirm your mail"

### Test 2: Login

1. Torna all'app
2. Click "Login"
3. Inserisci email e password
4. Dovresti vedere la dashboard (vuota per ora)

### Test 3: Crea il primo portfolio

```typescript
// Opzione A: Via UI (in development)
// 1. Click "Create Portfolio"
// 2. Nome: "My Portfolio"
// 3. Currency: EUR
// 4. Click Save

// Opzione B: Via SQL (per testing veloce)
// Nel Supabase SQL Editor:

INSERT INTO portfolios (user_id, name, currency, is_default)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'tuo@email.com'),
  'My Portfolio',
  'EUR',
  true
);
```

### Test 4: Aggiungi il primo asset

```sql
-- Nel Supabase SQL Editor:
INSERT INTO assets (
  portfolio_id,
  asset_type,
  symbol,
  name,
  quantity,
  purchase_price,
  purchase_date,
  current_price
) VALUES (
  (SELECT id FROM portfolios WHERE name = 'My Portfolio' LIMIT 1),
  'stock',
  'AAPL',
  'Apple Inc.',
  10,
  150.00,
  '2024-01-01',
  180.00
);
```

Refresh la dashboard - dovresti vedere:
- Total Value: €1,800
- Total Gain: €300 (+20%)
- 1 asset nella tabella

## 📚 Esempi Pratici

### Esempio 1: Aggiungere Bitcoin

```typescript
// src/examples/addBitcoin.ts

import { supabase } from '@/lib/supabase'
import { cryptoApi } from '@/lib/api/cryptoApi'

async function addBitcoin() {
  // 1. Fetch current Bitcoin price
  const quote = await cryptoApi.getQuote('BTC')
  
  // 2. Get user's portfolio
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id')
    .limit(1)
    .single()
  
  if (!portfolio) throw new Error('No portfolio found')
  
  // 3. Add Bitcoin asset
  const { data, error } = await supabase
    .from('assets')
    .insert({
      portfolio_id: portfolio.id,
      asset_type: 'crypto',
      symbol: 'BTC',
      name: 'Bitcoin',
      quantity: 0.5, // 0.5 BTC
      purchase_price: 40000, // Bought at €40k
      purchase_date: '2023-01-01',
      current_price: quote.price,
    })
  
  console.log('Bitcoin added!', data)
}
```

### Esempio 2: Calcolare Tax per il 2024

```typescript
// src/examples/calculateTax.ts

import { supabase } from '@/lib/supabase'
import { taxCalculator } from '@/lib/taxCalculator'

async function calculateMyTaxes() {
  const userId = (await supabase.auth.getUser()).data.user?.id
  
  if (!userId) throw new Error('Not authenticated')
  
  // Fetch transactions, assets, cash flows
  const [
    { data: transactions },
    { data: assets },
    { data: cashFlows }
  ] = await Promise.all([
    supabase.from('transactions').select('*'),
    supabase.from('assets').select('*'),
    supabase.from('cash_flows').select('*')
  ])
  
  // Calculate taxes for 2024
  const result = taxCalculator.calculateTaxes(
    transactions || [],
    assets || [],
    cashFlows || [],
    2024
  )
  
  console.log('=== Tax Summary 2024 ===')
  console.log(`Capital Gains: €${result.total_capital_gains.toFixed(2)}`)
  console.log(`Dividends: €${result.dividend_income.toFixed(2)}`)
  console.log(`Interest: €${result.interest_income.toFixed(2)}`)
  console.log(`---`)
  console.log(`TOTAL TAX OWED: €${result.total_tax_owed.toFixed(2)}`)
  
  return result
}
```

### Esempio 3: Refresh Prezzi in Real-time

```typescript
// src/examples/refreshPrices.ts

import { supabase } from '@/lib/supabase'
import { stockApi } from '@/lib/api/stockApi'
import { cryptoApi } from '@/lib/api/cryptoApi'

async function refreshAllPrices(portfolioId: string) {
  // Get all assets that have symbols
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .not('symbol', 'is', null)
  
  if (!assets) return
  
  const updates: Array<{ id: string; price: number }> = []
  
  for (const asset of assets) {
    try {
      let newPrice: number | null = null
      
      if (asset.asset_type === 'stock' || asset.asset_type === 'etf') {
        const quote = await stockApi.getQuote(asset.symbol!)
        newPrice = quote.price
      } else if (asset.asset_type === 'crypto') {
        const quote = await cryptoApi.getQuote(asset.symbol!)
        newPrice = quote.price
      }
      
      if (newPrice) {
        updates.push({ id: asset.id, price: newPrice })
      }
    } catch (error) {
      console.error(`Error updating ${asset.symbol}:`, error)
    }
  }
  
  // Update all prices in batch
  for (const update of updates) {
    await supabase
      .from('assets')
      .update({ current_price: update.price, last_updated: new Date().toISOString() })
      .eq('id', update.id)
  }
  
  console.log(`Updated ${updates.length} prices`)
}
```

## 🔧 Troubleshooting

### Problema: "Network request failed"

**Causa**: Supabase URL o API key errati

**Soluzione**:
1. Verifica `.env.local`
2. Controlla che le credenziali siano corrette
3. Restart del dev server: `Ctrl+C`, poi `npm run dev`

### Problema: "Row Level Security Policy Violation"

**Causa**: RLS policies non permettono l'operazione

**Soluzione**:
```sql
-- Nel Supabase SQL Editor, verifica le policies:
SELECT * FROM pg_policies WHERE tablename = 'assets';

-- Se mancano, ri-run la migration 001_initial_schema.sql
```

### Problema: "Cannot read properties of null"

**Causa**: Dati non caricati o utente non autenticato

**Soluzione**:
```typescript
// Aggiungi controlli null-safety
if (!user) {
  console.error('User not authenticated')
  return
}

if (!portfolio) {
  console.error('No portfolio found')
  return
}
```

### Problema: API rate limits

**Causa**: Troppe chiamate alle API gratuite

**Soluzione**:
```typescript
// Usa il caching aggressivo
const CACHE_TTL = 5 * 60 * 1000 // 5 minuti

// Batch requests
const quotes = await stockApi.getBatchQuotes(['AAPL', 'GOOGL', 'MSFT'])
```

## 🎨 Customization

### Cambio colori del tema

Modifica `src/index.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%; /* Blu di default */
  
  /* Per un tema verde "money": */
  --primary: 142 76% 36%; /* Verde */
  
  /* Per un tema viola "premium": */
  --primary: 262 83% 58%; /* Viola */
}
```

### Aggiungi un nuovo tipo di asset

1. **Aggiorna il type**:
```typescript
// src/types/index.ts
export type AssetType =
  | 'stock'
  | 'bond'
  | 'etf'
  | 'crypto'
  | 'real_estate'
  | 'luxury'
  | 'commodity'
  | 'cash'
  | 'wine' // <-- Nuovo!
```

2. **Aggiorna il database constraint**:
```sql
ALTER TABLE assets 
DROP CONSTRAINT IF EXISTS assets_asset_type_check;

ALTER TABLE assets
ADD CONSTRAINT assets_asset_type_check
CHECK (asset_type IN (
  'stock', 'bond', 'etf', 'crypto', 
  'real_estate', 'luxury', 'commodity', 
  'cash', 'wine'
));
```

3. **Aggiungi logica specifica**:
```typescript
// src/lib/api/wineApi.ts
export class WineApiClient {
  async getValuation(wine: { producer: string; vintage: number }) {
    // Integrazione con Wine-Searcher API o simili
  }
}
```

## 📊 Monitoring in Production

### Setup Sentry (Error Tracking)

```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: 'https://your-sentry-dsn',
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

### Setup PostHog (Analytics)

```bash
npm install posthog-js
```

```typescript
// src/lib/analytics.ts
import posthog from 'posthog-js'

posthog.init('your-posthog-key', {
  api_host: 'https://app.posthog.com',
  autocapture: false, // GDPR compliance
})

export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    posthog.capture(event, properties)
  },
  
  identify: (userId: string, properties?: Record<string, any>) => {
    posthog.identify(userId, properties)
  },
}
```

## 🚀 Deploy to Production

### Deploy Frontend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# Settings > Environment Variables
```

### Deploy Edge Functions (Supabase)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy refresh-prices

# Set secrets
supabase secrets set ALPHA_VANTAGE_API_KEY=your_key
```

## 📞 Support & Community

- **GitHub Issues**: Per bug e feature requests
- **Discord**: Join Supabase Discord per aiuto tecnico
- **Email**: support@wealthtracker.io (setup dopo deploy)

## 🎯 Next Steps

Ora che hai l'app funzionante:

1. ✅ Familiarizza con il codice
2. ✅ Aggiungi più asset di test
3. ✅ Prova il tax calculator
4. ⬜ Personalizza l'UI
5. ⬜ Aggiungi nuove feature
6. ⬜ Deploy su Vercel
7. ⬜ Raccogli feedback da utenti beta

Buon coding! 💻✨
