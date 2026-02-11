# 💎 WealthTracker - Gestione Patrimonio Unificata

Piattaforma completa per il monitoraggio e la gestione del patrimonio personale con supporto multi-asset, calcolo imposte e analisi avanzate.

## 🎯 Caratteristiche Principali

### Asset Management
- **Titoli azionari e obbligazionari**: Integrazione API real-time (Alpha Vantage, Yahoo Finance)
- **Metalli preziosi**: Oro, argento, platino con quotazioni aggiornate
- **Beni di lusso**: Orologi, gioielli, opere d'arte (valutazione manuale)
- **Immobili**: Tracking patrimonio immobiliare con rivalutazione
- **Criptovalute**: Bitcoin, Ethereum e altcoin (CoinGecko API)

### Financial Features
- **Cash Flow Tracking**: Dividendi, cedole, affitti (storico e previsionale)
- **Capital Gains**: Calcolo automatico con metodo FIFO/LIFO
- **Tax Calculator**: Strumento calcolo imposte italiane (26% capital gain, 12.5% titoli di stato)
- **Debt Management**: Tracking mutui, prestiti, finanziamenti
- **Open Banking**: Integrazione PSD2 per import automatico transazioni

### Analytics & Reporting
- **Portfolio Performance**: ROI, Sharpe Ratio, volatilità, drawdown
- **Asset Allocation**: Visualizzazione geografica, settoriale, per classe
- **Risk Analysis**: VaR, stress testing, correlation matrix
- **Historical Charts**: Andamento patrimonio nel tempo
- **Custom Reports**: Export PDF con analisi personalizzate

### Security & Compliance
- **Encryption**: AES-256 encryption at rest, TLS 1.3 in transit
- **2FA**: Autenticazione a due fattori obbligatoria per tier premium
- **Audit Log**: Tracciamento completo di tutte le operazioni
- **GDPR Compliant**: Export dati, right to be forgotten
- **Bank-level Security**: ISO 27001 compliant infrastructure

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand + React Query (TanStack Query)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Date Handling**: date-fns
- **HTTP Client**: Axios con interceptors

### Backend (Supabase)
- **Database**: PostgreSQL 15 con Row Level Security (RLS)
- **Authentication**: Supabase Auth con Magic Links, OAuth (Google, Apple)
- **Storage**: Supabase Storage per documenti e immagini
- **Edge Functions**: Deno per logica custom (calcoli complessi, API third-party)
- **Realtime**: Supabase Realtime per aggiornamenti live

### External APIs
- **Stock Data**: Alpha Vantage, Yahoo Finance API
- **Crypto Data**: CoinGecko API
- **Precious Metals**: Metals API, LBMA
- **Open Banking**: TrueLayer, Plaid (EU compliance)
- **Tax Data**: API Agenzia delle Entrate (quando disponibile)

### DevOps
- **Hosting**: Vercel (frontend), Supabase (backend)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (error tracking), PostHog (analytics)
- **Testing**: Vitest + React Testing Library

## 📊 Modello di Business - Freemium

### Free Tier
- Max 3 asset classes
- 1 portfolio
- Basic charts e analytics
- Manual data entry only
- 7 giorni di storico
- Community support

### Premium Tier (€19.99/mese o €199/anno)
- Unlimited asset classes
- Unlimited portfolios
- Advanced analytics (Sharpe, VaR, correlation)
- Open Banking integration
- API integrations (real-time data)
- Tax calculator completo
- Storico illimitato
- Priority support
- Export reports PDF/Excel
- 2FA obbligatorio

### Professional Tier (€49.99/mese) - Per consulenti finanziari
- Tutto Premium +
- Multi-client management
- White-label reports
- API access
- Dedicated account manager
- Custom integrations

## 🗄️ Database Schema (PostgreSQL)

### Core Tables
```sql
-- Users (gestito da Supabase Auth)
auth.users

-- User Profiles
profiles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  subscription_tier text,
  created_at timestamp,
  updated_at timestamp
)

-- Portfolios
portfolios (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  name text,
  currency text DEFAULT 'EUR',
  created_at timestamp
)

-- Assets
assets (
  id uuid PRIMARY KEY,
  portfolio_id uuid REFERENCES portfolios,
  asset_type text, -- 'stock', 'bond', 'crypto', 'real_estate', 'luxury', 'commodity'
  symbol text, -- Ticker o identificativo
  name text,
  quantity numeric,
  purchase_price numeric,
  purchase_date date,
  current_price numeric,
  last_updated timestamp,
  metadata jsonb -- Dati specifici per tipo (ISIN, indirizzo immobile, etc)
)

-- Transactions
transactions (
  id uuid PRIMARY KEY,
  asset_id uuid REFERENCES assets,
  transaction_type text, -- 'buy', 'sell', 'dividend', 'coupon', 'split'
  quantity numeric,
  price numeric,
  fees numeric,
  transaction_date date,
  notes text
)

-- Cash Flows
cash_flows (
  id uuid PRIMARY KEY,
  portfolio_id uuid REFERENCES portfolios,
  asset_id uuid REFERENCES assets,
  flow_type text, -- 'dividend', 'coupon', 'rent', 'interest'
  amount numeric,
  currency text,
  payment_date date,
  is_forecasted boolean,
  notes text
)

-- Debts
debts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  debt_type text, -- 'mortgage', 'loan', 'credit_card'
  lender text,
  principal_amount numeric,
  interest_rate numeric,
  remaining_balance numeric,
  monthly_payment numeric,
  start_date date,
  end_date date,
  metadata jsonb
)

-- Tax Events
tax_events (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  tax_year integer,
  event_type text, -- 'capital_gain', 'dividend', 'interest'
  taxable_amount numeric,
  tax_rate numeric,
  tax_owed numeric,
  asset_id uuid REFERENCES assets,
  event_date date
)

-- Price History (per caching)
price_history (
  id uuid PRIMARY KEY,
  symbol text,
  asset_type text,
  price numeric,
  recorded_at timestamp,
  source text
)
```

## 🔐 Security Best Practices

### Authentication
```typescript
// Supabase Auth con email verification obbligatoria
// Password requirements: min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
// Session refresh automatico
// Rate limiting su login attempts
```

### Data Protection
```typescript
// Row Level Security (RLS) policies per ogni tabella
// Encryption at rest per campi sensibili
// Input validation con Zod su tutti i form
// SQL injection protection (Supabase prepared statements)
// XSS protection (React auto-escape + CSP headers)
```

### API Security
```typescript
// API keys in environment variables
// Rate limiting su API calls (max 100 req/min)
// CORS policy restrictive
// JWT token validation
// Webhook signature verification
```

## 📱 Roadmap

### Phase 1 - MVP (3-4 mesi)
- [x] Setup progetto e infrastruttura
- [ ] Auth flow completo (email, Google, Apple)
- [ ] Dashboard con portfolio overview
- [ ] CRUD assets base (stock, crypto)
- [ ] Integrazione API prezzi real-time
- [ ] Charts andamento patrimonio
- [ ] Responsive design

### Phase 2 - Core Features (2-3 mesi)
- [ ] Asset aggiuntivi (bonds, real estate, luxury)
- [ ] Cash flow tracking e forecasting
- [ ] Transaction history completo
- [ ] Basic tax calculator
- [ ] Import CSV
- [ ] Export reports PDF

### Phase 3 - Advanced (3-4 mesi)
- [ ] Open Banking integration (TrueLayer)
- [ ] Advanced analytics (Sharpe, VaR, correlation)
- [ ] Capital gains calculator FIFO/LIFO
- [ ] Debt management
- [ ] Multi-portfolio support
- [ ] Freemium paywall implementation

### Phase 4 - Mobile (2-3 mesi)
- [ ] React Native app (iOS priority)
- [ ] Code sharing con web app
- [ ] Push notifications per cash flows
- [ ] Biometric authentication
- [ ] Offline mode

### Phase 5 - Scale (ongoing)
- [ ] Professional tier features
- [ ] White-label solution
- [ ] API pubblica per integrazioni
- [ ] Multi-currency support
- [ ] Tax filing integration

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/wealth-tracker.git
cd wealth-tracker

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Compilare con le tue Supabase credentials

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📦 Project Structure

```
wealth-tracker/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── dashboard/    # Dashboard specific
│   │   ├── assets/       # Asset management
│   │   ├── analytics/    # Charts & analytics
│   │   └── auth/         # Authentication
│   ├── lib/              # Utilities
│   │   ├── supabase.ts   # Supabase client
│   │   ├── api/          # API integrations
│   │   └── utils/        # Helper functions
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # Zustand stores
│   ├── types/            # TypeScript types
│   ├── pages/            # Route pages
│   └── App.tsx           # Main app component
├── supabase/
│   ├── migrations/       # Database migrations
│   ├── functions/        # Edge functions
│   └── seed.sql          # Seed data
├── tests/                # Test files
└── public/               # Static assets
```

## 🤝 Contributing

Contributions are welcome! Please read CONTRIBUTING.md for details.

## 📄 License

MIT License - see LICENSE.md

## 📧 Contact

- Email: support@wealthtracker.io
- Website: https://wealthtracker.io
- Twitter: @wealthtracker

---

**Made with ❤️ in Italy** 🇮🇹
