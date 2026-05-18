CREATE TABLE IF NOT EXISTS digital_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users(user_id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(320) NOT NULL,
  service_type VARCHAR(255) NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  contract_text TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  key_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  sign_token TEXT,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_contracts_user ON digital_contracts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_contracts_status ON digital_contracts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_digital_contracts_token ON digital_contracts(sign_token);
