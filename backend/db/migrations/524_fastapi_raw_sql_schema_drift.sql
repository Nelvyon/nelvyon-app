-- 524 — Columnas que los servicios FastAPI ya escribian y ningun esquema creaba.
--
-- PROBLEMA
-- --------
-- `intent_data_service.py` y `email_warmup_service.py` usan SQL crudo y no
-- tienen modelo SQLAlchemy, asi que `Base.metadata.create_all` no las cubre.
-- Sus tablas las crea la migracion 507, y 507 transcribio nombres distintos:
-- los INSERT fallaban con `column ... does not exist` y los endpoints devolvian
-- 500. Veintitres tests lo reflejaban.
--
-- DIRECCION DE LA CORRECCION
-- --------------------------
-- Manda el servicio, no 507, y la cronologia es la evidencia:
--
--   * `intent_data_service.py`  2026-05-25 (2948690f), con `lead_id` desde su
--     primer commit;
--   * `email_warmup_service.py` 2026-05-25 (fa4d5e2e);
--   * `507`                     2026-07-04 (f24ffb93), seis semanas despues.
--
-- 507 no fijo un contrato que los servicios rompieran luego: se escribio a
-- posteriori para documentar lo que ya existia, y se equivoco al transcribirlo.
-- Ademas nadie lee `contact_id` ni `payload_json` en `intent_events`, mientras
-- que `lead_id`, `page` y `metadata_json` se escriben Y se leen.
--
-- ADITIVA Y NO DESTRUCTIVA
-- ------------------------
-- No se renombra ni se elimina `contact_id` / `payload_json`, aunque queden
-- huerfanas. Su limpieza es una decision posterior, con datos delante. Todo
-- nullable: no se inventa backfill para filas que, por definicion, no existen
-- (el INSERT nunca llego a completarse).
--
-- TIPOS VERIFICADOS CONTRA EL CODIGO, NO COPIADOS DE 507
-- -----------------------------------------------------
--   * `metadata_json` es JSONB, no TEXT: `core/sql_compat.json_bind` emite
--     `CAST(:meta AS jsonb)` en PostgreSQL. Copiar el `TEXT DEFAULT '{}'` de
--     `payload_json` habria roto el CAST. Precedente en 520, que ya usa JSONB.
--   * `dkim_ok`/`spf_ok`/`dmarc_ok` son INTEGER, no BOOLEAN: el servicio pasa
--     `1 if dns.get(...) else 0`, y PostgreSQL no castea integer a boolean de
--     forma implicita.
--
-- `pr_releases.client_id` queda DELIBERADAMENTE fuera: su semantica no esta
-- demostrada y una relacion de dominio incorrecta es peor que una feature roja.

ALTER TABLE intent_events
  ADD COLUMN IF NOT EXISTS lead_id TEXT;

ALTER TABLE intent_events
  ADD COLUMN IF NOT EXISTS page TEXT;

ALTER TABLE intent_events
  ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb;

-- Las consultas del servicio filtran siempre por (workspace_id, lead_id).
CREATE INDEX IF NOT EXISTS ix_intent_events_workspace_lead
  ON intent_events (workspace_id, lead_id);

ALTER TABLE email_warmup_accounts
  ADD COLUMN IF NOT EXISTS domain TEXT;

ALTER TABLE email_warmup_accounts
  ADD COLUMN IF NOT EXISTS warmup_day INTEGER DEFAULT 1;

ALTER TABLE email_warmup_accounts
  ADD COLUMN IF NOT EXISTS deliverability_score INTEGER;

ALTER TABLE email_warmup_accounts
  ADD COLUMN IF NOT EXISTS dkim_ok INTEGER;

ALTER TABLE email_warmup_accounts
  ADD COLUMN IF NOT EXISTS spf_ok INTEGER;

ALTER TABLE email_warmup_accounts
  ADD COLUMN IF NOT EXISTS dmarc_ok INTEGER;

ALTER TABLE email_warmup_accounts
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

COMMENT ON COLUMN intent_events.lead_id IS
  'Lead que origina el evento. La entidad de intent scoring es el lead, no el contacto.';
COMMENT ON COLUMN intent_events.metadata_json IS
  'Propiedades del evento. JSONB: el servicio escribe CAST(... AS jsonb).';
COMMENT ON COLUMN email_warmup_accounts.dkim_ok IS
  'Estado DNS como 0/1. INTEGER porque el servicio escribe enteros, no booleanos.';
