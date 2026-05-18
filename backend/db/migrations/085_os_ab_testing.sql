CREATE TABLE ab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  winner_variant text,
  confidence_threshold numeric NOT NULL DEFAULT 0.95,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_ab_experiments_user ON ab_experiments(user_id);
CREATE INDEX idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX idx_ab_experiments_channel ON ab_experiments(channel);

CREATE TABLE ab_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_ab_variants_experiment ON ab_variants(experiment_id);
