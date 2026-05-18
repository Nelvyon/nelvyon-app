-- MIG 276 — Dunning log (Paddle payment recovery)
CREATE TABLE IF NOT EXISTS dunning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  subscription_id text NOT NULL,
  event_type text NOT NULL,
  attempt_number integer DEFAULT 1,
  paddle_event_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dunning_log_tenant_created
  ON dunning_log(tenant_id, created_at DESC);
