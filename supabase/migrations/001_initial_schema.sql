-- Supabase Database Schema for WealthTracker
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if re-running (careful in production!)
-- DROP TABLE IF EXISTS price_history CASCADE;
-- DROP TABLE IF EXISTS tax_events CASCADE;
-- DROP TABLE IF EXISTS debts CASCADE;
-- DROP TABLE IF EXISTS cash_flows CASCADE;
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS assets CASCADE;
-- DROP TABLE IF EXISTS portfolios CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'professional')),
  subscription_expires_at TIMESTAMPTZ,
  preferences JSONB DEFAULT '{
    "default_currency": "EUR",
    "date_format": "DD/MM/YYYY",
    "theme": "system",
    "notifications_enabled": true,
    "email_reports": false
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PORTFOLIOS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP', 'CHF', 'JPY')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ASSETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'bond', 'etf', 'crypto', 'real_estate', 'luxury', 'commodity', 'cash')),
  symbol TEXT,
  name TEXT NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL CHECK (quantity >= 0),
  purchase_price NUMERIC(20, 2) NOT NULL CHECK (purchase_price >= 0),
  purchase_date DATE NOT NULL,
  current_price NUMERIC(20, 2) DEFAULT 0 CHECK (current_price >= 0),
  current_value NUMERIC(20, 2) GENERATED ALWAYS AS (quantity * current_price) STORED,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_portfolio_id ON assets(portfolio_id);
CREATE INDEX idx_assets_asset_type ON assets(asset_type);
CREATE INDEX idx_assets_symbol ON assets(symbol) WHERE symbol IS NOT NULL;

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'coupon', 'split', 'deposit', 'withdrawal')),
  quantity NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 2) NOT NULL CHECK (price >= 0),
  fees NUMERIC(20, 2) DEFAULT 0 CHECK (fees >= 0),
  total_amount NUMERIC(20, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN transaction_type IN ('buy', 'deposit') THEN (quantity * price) + fees
      WHEN transaction_type IN ('sell', 'withdrawal') THEN (quantity * price) - fees
      ELSE 0
    END
  ) STORED,
  transaction_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- =====================================================
-- CASH FLOWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('dividend', 'coupon', 'rent', 'interest', 'other')),
  amount NUMERIC(20, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_date DATE NOT NULL,
  is_forecasted BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cash_flows_portfolio_id ON cash_flows(portfolio_id);
CREATE INDEX idx_cash_flows_date ON cash_flows(payment_date DESC);
CREATE INDEX idx_cash_flows_forecasted ON cash_flows(is_forecasted);

-- =====================================================
-- DEBTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  debt_type TEXT NOT NULL CHECK (debt_type IN ('mortgage', 'loan', 'credit_card', 'line_of_credit')),
  lender TEXT NOT NULL,
  principal_amount NUMERIC(20, 2) NOT NULL CHECK (principal_amount >= 0),
  interest_rate NUMERIC(5, 2) NOT NULL CHECK (interest_rate >= 0),
  remaining_balance NUMERIC(20, 2) NOT NULL CHECK (remaining_balance >= 0),
  monthly_payment NUMERIC(20, 2) NOT NULL CHECK (monthly_payment >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debts_user_id ON debts(user_id);
CREATE INDEX idx_debts_type ON debts(debt_type);

CREATE TRIGGER update_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TAX EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tax_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tax_year INTEGER NOT NULL CHECK (tax_year >= 2000 AND tax_year <= 2100),
  event_type TEXT NOT NULL CHECK (event_type IN ('capital_gain', 'dividend', 'interest', 'other')),
  taxable_amount NUMERIC(20, 2) NOT NULL,
  tax_rate NUMERIC(5, 4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 1),
  tax_owed NUMERIC(20, 2) NOT NULL CHECK (tax_owed >= 0),
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tax_events_user_id ON tax_events(user_id);
CREATE INDEX idx_tax_events_year ON tax_events(tax_year DESC);
CREATE INDEX idx_tax_events_type ON tax_events(event_type);

-- =====================================================
-- PRICE HISTORY TABLE (for caching)
-- =====================================================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  price NUMERIC(20, 2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_price_history_symbol ON price_history(symbol);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at DESC);
CREATE UNIQUE INDEX idx_price_history_symbol_time ON price_history(symbol, recorded_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- PORTFOLIOS policies
CREATE POLICY "Users can view own portfolios"
  ON portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios"
  ON portfolios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios"
  ON portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- ASSETS policies
CREATE POLICY "Users can view own assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = assets.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create assets in own portfolios"
  ON assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = assets.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own assets"
  ON assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = assets.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own assets"
  ON assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = assets.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- TRANSACTIONS policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN portfolios ON portfolios.id = assets.portfolio_id
      WHERE assets.id = transactions.asset_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions for own assets"
  ON transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assets
      JOIN portfolios ON portfolios.id = assets.portfolio_id
      WHERE assets.id = transactions.asset_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN portfolios ON portfolios.id = assets.portfolio_id
      WHERE assets.id = transactions.asset_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN portfolios ON portfolios.id = assets.portfolio_id
      WHERE assets.id = transactions.asset_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- CASH FLOWS policies
CREATE POLICY "Users can view own cash flows"
  ON cash_flows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = cash_flows.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cash flows in own portfolios"
  ON cash_flows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = cash_flows.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cash flows"
  ON cash_flows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = cash_flows.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cash flows"
  ON cash_flows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = cash_flows.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- DEBTS policies
CREATE POLICY "Users can view own debts"
  ON debts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own debts"
  ON debts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts"
  ON debts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts"
  ON debts FOR DELETE
  USING (auth.uid() = user_id);

-- TAX EVENTS policies
CREATE POLICY "Users can view own tax events"
  ON tax_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tax events"
  ON tax_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax events"
  ON tax_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tax events"
  ON tax_events FOR DELETE
  USING (auth.uid() = user_id);

-- PRICE HISTORY policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can write to price_history
CREATE POLICY "Service role can manage price history"
  ON price_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- USEFUL FUNCTIONS
-- =====================================================

-- Function to get portfolio total value
CREATE OR REPLACE FUNCTION get_portfolio_value(p_portfolio_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(current_value), 0)
  FROM assets
  WHERE portfolio_id = p_portfolio_id;
$$ LANGUAGE SQL STABLE;

-- Function to get user's total net worth
CREATE OR REPLACE FUNCTION get_net_worth(p_user_id UUID)
RETURNS NUMERIC AS $$
  SELECT 
    COALESCE(SUM(a.current_value), 0) - COALESCE(SUM(d.remaining_balance), 0)
  FROM portfolios p
  LEFT JOIN assets a ON a.portfolio_id = p.id
  LEFT JOIN debts d ON d.user_id = p.user_id
  WHERE p.user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_portfolio_value TO authenticated;
GRANT EXECUTE ON FUNCTION get_net_worth TO authenticated;

-- =====================================================
-- INITIAL DATA / SEED (optional)
-- =====================================================

-- You can add seed data here if needed for testing
