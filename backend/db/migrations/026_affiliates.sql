-- MIG 293 — Affiliate program (nelvyon_users.user_id is TEXT)
CREATE TABLE IF NOT EXISTS affiliate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES nelvyon_users (user_id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  commission_rate numeric(5, 2) NOT NULL DEFAULT 20.00,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'banned')),
  total_clicks integer NOT NULL DEFAULT 0,
  total_conversions integer NOT NULL DEFAULT 0,
  total_earned numeric(10, 2) NOT NULL DEFAULT 0.00,
  pending_payout numeric(10, 2) NOT NULL DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_code ON affiliate_profiles (code);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  ip_hash text,
  user_agent text,
  referrer text,
  landed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code ON affiliate_clicks (code);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  converted_user_id text REFERENCES nelvyon_users (user_id) ON DELETE SET NULL,
  plan text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  commission numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_code ON affiliate_conversions (code);

ALTER TABLE affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affiliate_profiles_select_own ON affiliate_profiles;
CREATE POLICY affiliate_profiles_select_own ON affiliate_profiles
  FOR SELECT
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS affiliate_profiles_update_own ON affiliate_profiles;
CREATE POLICY affiliate_profiles_update_own ON affiliate_profiles
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks FORCE ROW LEVEL SECURITY;

ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affiliate_conversions_select_own ON affiliate_conversions;
CREATE POLICY affiliate_conversions_select_own ON affiliate_conversions
  FOR SELECT
  USING (
    code IN (
      SELECT ap.code FROM affiliate_profiles ap WHERE ap.user_id = auth.uid()::text
    )
  );
