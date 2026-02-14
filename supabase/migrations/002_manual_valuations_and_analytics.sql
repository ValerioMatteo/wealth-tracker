-- Migration: manual_valuations table + get_portfolio_analytics function
-- Part of Phase 2: Backend-First Architecture

-- =====================================================
-- MANUAL VALUATIONS TABLE
-- =====================================================
-- Tracks manual, AI, and appraisal valuations for non-quoted assets
CREATE TABLE IF NOT EXISTS manual_valuations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  value NUMERIC(20, 2) NOT NULL CHECK (value >= 0),
  source TEXT NOT NULL CHECK (source IN ('manual', 'ai', 'appraisal')),
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  reasoning TEXT,
  factors TEXT[],
  data_sources TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manual_valuations_asset_id ON manual_valuations(asset_id);
CREATE INDEX idx_manual_valuations_user_id ON manual_valuations(user_id);
CREATE INDEX idx_manual_valuations_created_at ON manual_valuations(created_at DESC);

-- =====================================================
-- RLS POLICIES FOR manual_valuations
-- =====================================================
ALTER TABLE manual_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own manual valuations"
  ON manual_valuations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own manual valuations"
  ON manual_valuations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own manual valuations"
  ON manual_valuations FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all manual valuations (for Edge Functions)
CREATE POLICY "Service role can manage manual valuations"
  ON manual_valuations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PORTFOLIO ANALYTICS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION get_portfolio_analytics(p_portfolio_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_value', COALESCE(SUM(a.current_value), 0),
    'total_cost', COALESCE(SUM(a.quantity * a.purchase_price), 0),
    'total_gain', COALESCE(SUM(a.current_value - (a.quantity * a.purchase_price)), 0),
    'gain_percent', CASE
      WHEN COALESCE(SUM(a.quantity * a.purchase_price), 0) > 0
      THEN ROUND(((COALESCE(SUM(a.current_value), 0) - COALESCE(SUM(a.quantity * a.purchase_price), 0)) / COALESCE(SUM(a.quantity * a.purchase_price), 1)) * 100, 2)
      ELSE 0
    END,
    'asset_count', COUNT(a.id),
    'allocation', (
      SELECT json_agg(alloc)
      FROM (
        SELECT
          a2.asset_type,
          SUM(a2.current_value) AS value,
          ROUND(
            (SUM(a2.current_value) / NULLIF((SELECT SUM(a3.current_value) FROM assets a3 WHERE a3.portfolio_id = p_portfolio_id), 0)) * 100,
            2
          ) AS percentage,
          COUNT(a2.id) AS count
        FROM assets a2
        WHERE a2.portfolio_id = p_portfolio_id
        GROUP BY a2.asset_type
        ORDER BY SUM(a2.current_value) DESC
      ) alloc
    ),
    'top_performers', (
      SELECT json_agg(perf)
      FROM (
        SELECT a4.id, a4.name, a4.asset_type, a4.symbol, a4.current_value,
               a4.purchase_price, a4.quantity,
               CASE WHEN a4.purchase_price > 0
                    THEN ROUND(((a4.current_price - a4.purchase_price) / a4.purchase_price) * 100, 2)
                    ELSE 0
               END AS gain_percent
        FROM assets a4
        WHERE a4.portfolio_id = p_portfolio_id AND a4.purchase_price > 0
        ORDER BY ((a4.current_price - a4.purchase_price) / NULLIF(a4.purchase_price, 0)) DESC
        LIMIT 5
      ) perf
    ),
    'worst_performers', (
      SELECT json_agg(perf)
      FROM (
        SELECT a5.id, a5.name, a5.asset_type, a5.symbol, a5.current_value,
               a5.purchase_price, a5.quantity,
               CASE WHEN a5.purchase_price > 0
                    THEN ROUND(((a5.current_price - a5.purchase_price) / a5.purchase_price) * 100, 2)
                    ELSE 0
               END AS gain_percent
        FROM assets a5
        WHERE a5.portfolio_id = p_portfolio_id AND a5.purchase_price > 0
        ORDER BY ((a5.current_price - a5.purchase_price) / NULLIF(a5.purchase_price, 0)) ASC
        LIMIT 5
      ) perf
    )
  ) INTO result
  FROM assets a
  WHERE a.portfolio_id = p_portfolio_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_portfolio_analytics TO authenticated;
