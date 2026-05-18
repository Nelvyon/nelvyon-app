CREATE TABLE referral_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_referral_results_user_id ON referral_results(user_id);
CREATE INDEX idx_referral_results_agent_id ON referral_results(agent_id);
CREATE INDEX idx_referral_results_created_at ON referral_results(created_at DESC);

CREATE TABLE referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  clicks int NOT NULL DEFAULT 0,
  conversiones int NOT NULL DEFAULT 0,
  recompensas_aplicadas int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
