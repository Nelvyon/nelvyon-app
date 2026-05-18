-- MIG 281 — Early Adopter offer (40% permanent discount, 200 slots)
CREATE TABLE IF NOT EXISTS early_adopter_config (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean DEFAULT true,
  max_slots integer DEFAULT 200,
  used_slots integer DEFAULT 0,
  discount_pct integer DEFAULT 40,
  expires_at timestamptz DEFAULT '2026-05-22 15:00:00+02',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT early_adopter_config_singleton CHECK (id = 1)
);

INSERT INTO early_adopter_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE nelvyon_users
  ADD COLUMN IF NOT EXISTS is_early_adopter boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_nelvyon_users_early_adopter
  ON nelvyon_users(is_early_adopter)
  WHERE is_early_adopter = true;
