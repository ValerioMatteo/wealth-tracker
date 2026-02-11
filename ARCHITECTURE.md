# WealthTracker - Architecture & Best Practices

## 🏗️ Architettura Generale

### Frontend Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React App (Vite)                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐    ┌──────────────┐              │
│  │   Pages      │    │  Components  │              │
│  │  - Dashboard │    │  - UI (shadcn)│             │
│  │  - Assets    │    │  - Charts    │              │
│  │  - Taxes     │    │  - Forms     │              │
│  └──────────────┘    └──────────────┘              │
│                                                       │
│  ┌──────────────┐    ┌──────────────┐              │
│  │   Stores     │    │    Hooks     │              │
│  │  - Auth      │    │  - useQuery  │              │
│  │  - Portfolio │    │  - useMutation│             │
│  └──────────────┘    └──────────────┘              │
│                                                       │
│  ┌─────────────────────────────────┐                │
│  │       API Layer                 │                │
│  │  - Supabase Client              │                │
│  │  - Stock API                    │                │
│  │  - Crypto API                   │                │
│  │  - Metals API                   │                │
│  └─────────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Backend                        │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐    ┌──────────────┐              │
│  │  PostgreSQL  │    │  Auth        │              │
│  │  + RLS       │    │  - Email     │              │
│  │              │    │  - OAuth     │              │
│  └──────────────┘    │  - Magic Link│              │
│                      └──────────────┘              │
│                                                       │
│  ┌──────────────┐    ┌──────────────┐              │
│  │ Edge Funcs   │    │  Storage     │              │
│  │ - Refresh    │    │  - Documents │              │
│  │   Prices     │    │  - Images    │              │
│  │ - Tax Calc   │    └──────────────┘              │
│  └──────────────┘                                    │
│                                                       │
│  ┌─────────────────────────────────┐                │
│  │      Realtime (WebSocket)       │                │
│  │   - Price updates               │                │
│  │   - Portfolio changes           │                │
│  └─────────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

## 🔒 Security Best Practices

### 1. Authentication Security

#### Password Requirements
```typescript
// Minimum 12 characters
// At least 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
```

#### Session Management
- JWT tokens stored in httpOnly cookies (set by Supabase)
- Automatic token refresh before expiration
- Session timeout after 30 minutes of inactivity
- Logout on all devices option

#### 2FA (Two-Factor Authentication)
- Optional for Free tier
- **Mandatory for Premium/Professional tiers**
- TOTP-based (Google Authenticator, Authy)
- Backup codes provided

### 2. Database Security (Row Level Security)

#### RLS Policies
Every table has strict RLS policies:

```sql
-- Example: Users can only see their own data
CREATE POLICY "Users can view own portfolios"
  ON portfolios FOR SELECT
  USING (auth.uid() = user_id);

-- No direct access to sensitive data
CREATE POLICY "Service role can manage price history"
  ON price_history FOR ALL
  TO service_role
  USING (true);
```

#### Data Encryption
- **At rest**: PostgreSQL encryption (AES-256)
- **In transit**: TLS 1.3 for all connections
- **Sensitive fields**: Additional encryption for financial data

### 3. API Security

#### API Key Management
```typescript
// ❌ NEVER expose API keys in frontend
const API_KEY = import.meta.env.VITE_API_KEY // BAD!

// ✅ Use Edge Functions to proxy API calls
const response = await supabase.functions.invoke('fetch-prices', {
  body: { symbols: ['AAPL', 'GOOGL'] }
})
```

#### Rate Limiting
- 100 requests/minute per user (frontend)
- 1000 requests/hour per IP (edge functions)
- Progressive backoff on repeated failures

#### CORS Policy
```typescript
// Only allow requests from your domain
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}
```

### 4. Input Validation

#### Client-side with Zod
```typescript
import { z } from 'zod'

const assetSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().positive(),
  purchase_price: z.number().nonnegative(),
  symbol: z.string().regex(/^[A-Z]{1,10}$/).optional(),
})

// Validate before sending to backend
const validData = assetSchema.parse(formData)
```

#### Server-side (Edge Functions)
```typescript
// Always validate on the server too!
if (!isValidSymbol(symbol)) {
  throw new Error('Invalid symbol format')
}

if (amount < 0 || amount > MAX_AMOUNT) {
  throw new Error('Amount out of range')
}
```

### 5. XSS Prevention

#### React Auto-escapes
React automatically escapes values in JSX, but be careful with:

```typescript
// ❌ Dangerous - can execute scripts
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Safe - React escapes automatically
<div>{userInput}</div>

// ✅ Safe - DOMPurify for HTML content
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(htmlContent) 
}} />
```

#### CSP Headers
```typescript
// Set in Vercel configuration
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.supabase.io;
`
```

### 6. SQL Injection Prevention

Supabase uses prepared statements, but always:

```typescript
// ✅ Use parameterized queries
const { data } = await supabase
  .from('assets')
  .select('*')
  .eq('symbol', userInput) // Safe - parameterized

// ❌ NEVER build queries with string concatenation
const query = `SELECT * FROM assets WHERE symbol = '${userInput}'` // DANGEROUS!
```

## 📊 Performance Optimization

### 1. Code Splitting
```typescript
// Lazy load pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const TaxesPage = lazy(() => import('./pages/TaxesPage'))

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<DashboardPage />} />
  </Routes>
</Suspense>
```

### 2. React Query Caching
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min - data is fresh
      cacheTime: 10 * 60 * 1000, // 10 min - keep in cache
      refetchOnWindowFocus: false,
    },
  },
})
```

### 3. Memoization
```typescript
import { useMemo, useCallback } from 'react'

// Expensive calculations
const portfolioValue = useMemo(() => {
  return assets.reduce((sum, asset) => sum + asset.current_value, 0)
}, [assets])

// Callbacks
const handleRefresh = useCallback(async () => {
  await refreshPrices(portfolioId)
}, [portfolioId, refreshPrices])
```

### 4. Virtual Scrolling
For large lists (1000+ items):

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: transactions.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
})
```

## 🧪 Testing Strategy

### Unit Tests (Vitest)
```typescript
import { describe, it, expect } from 'vitest'
import { taxCalculator } from '@/lib/taxCalculator'

describe('Tax Calculator', () => {
  it('calculates capital gains correctly', () => {
    const result = taxCalculator.calculateCapitalGains(
      transactions,
      assets,
      2024
    )
    expect(result[0].tax_owed).toBe(260) // 26% of 1000 gain
  })
})
```

### Integration Tests
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { DashboardPage } from '@/pages/DashboardPage'

test('displays portfolio value', async () => {
  render(<DashboardPage />)
  
  await waitFor(() => {
    expect(screen.getByText(/Total Value/i)).toBeInTheDocument()
    expect(screen.getByText(/€50,000/i)).toBeInTheDocument()
  })
})
```

### E2E Tests (Playwright)
```typescript
import { test, expect } from '@playwright/test'

test('user can create asset', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('text=Add Asset')
  await page.fill('[name="name"]', 'Apple Stock')
  await page.fill('[name="quantity"]', '10')
  await page.click('text=Save')
  
  await expect(page.locator('text=Apple Stock')).toBeVisible()
})
```

## 🚀 Deployment

### Environment Variables
```bash
# Production .env
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SENTRY_DSN=your_sentry_dsn
VITE_ENV=production
```

### Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Environment variables in Vercel dashboard
# Settings > Environment Variables
```

### Supabase Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy refresh-prices
supabase functions deploy calculate-taxes

# Set secrets
supabase secrets set ALPHA_VANTAGE_API_KEY=your_key
```

## 📈 Monitoring

### Error Tracking (Sentry)
```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
})

// Automatic error boundary
<Sentry.ErrorBoundary fallback={<ErrorPage />}>
  <App />
</Sentry.ErrorBoundary>
```

### Analytics (PostHog)
```typescript
import posthog from 'posthog-js'

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
  autocapture: false, // GDPR compliance
})

// Track events
posthog.capture('asset_created', {
  asset_type: 'stock',
  value: 1000,
})
```

### Performance Monitoring
```typescript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric) {
  posthog.capture('web_vital', {
    metric_name: metric.name,
    value: metric.value,
  })
}

getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 📱 Mobile (React Native) - Phase 2

### Shared Code Strategy
```
wealth-tracker/
├── packages/
│   ├── shared/           # Shared TypeScript code
│   │   ├── types/
│   │   ├── utils/
│   │   ├── api/
│   │   └── stores/
│   ├── web/             # Web-specific (Vite)
│   └── mobile/          # React Native
└── supabase/            # Backend
```

### Key Differences
```typescript
// Web: localStorage
localStorage.setItem('key', 'value')

// Mobile: AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage'
await AsyncStorage.setItem('key', 'value')

// Conditional imports
import { Platform } from 'react-native'

const storage = Platform.select({
  web: () => localStorage,
  default: () => AsyncStorage,
})()
```

## 📚 Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

**Remember**: Security is not a feature, it's a requirement. Always validate input, never trust user data, and keep your dependencies updated.
