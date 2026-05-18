-- MIG 237 — Influencer OS (Virtual IA v1 + REACH).
-- La tabla influencer_results se creó en 088 con columna sector (REACH).
-- Las filas del stack Virtual IA v1 usan sector = 'influencer_v1'.

UPDATE influencer_results SET created_at = COALESCE(created_at, now()) WHERE created_at IS NULL;

ALTER TABLE influencer_results
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;
