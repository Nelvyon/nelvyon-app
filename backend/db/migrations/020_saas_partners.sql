CREATE TABLE IF NOT EXISTS saas_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) UNIQUE NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  referral_code VARCHAR(100) UNIQUE NOT NULL,
  commission_rate NUMERIC(4,2) DEFAULT 0.30,
  total_referrals INTEGER DEFAULT 0,
  total_earnings_eur NUMERIC(10,2) DEFAULT 0,
  pending_earnings_eur NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES saas_partners(id),
  referred_user_id VARCHAR(255) NOT NULL,
  commission_eur NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_code ON saas_partners(referral_code);
CREATE INDEX IF NOT EXISTS idx_partners_user ON saas_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_partner ON saas_partner_referrals(partner_id);
