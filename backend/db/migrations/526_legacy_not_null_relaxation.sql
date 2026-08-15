-- 526 — Restricciones NOT NULL legacy incompatibles con el writer real.
--
-- 524/525 anadieron las columnas que los servicios escriben. Faltaba la otra
-- mitad del mismo defecto: la migracion 507 declaro ADEMAS obligatorias unas
-- columnas que ningun writer moderno rellena, asi que el INSERT seguia fallando
-- — ahora con `NOT NULL constraint failed` en vez de `column does not exist`.
--
-- Es una dimension distinta de la misma deriva, por eso va en migracion propia:
--
--     524/525 -> columnas ausentes
--     526     -> NOT NULL legacy incompatibles
--
-- Para cuatro de las seis existe nombre moderno demostrado:
--
--     pr_releases.body              -> content
--     linkedin_outreach.message     -> messages_json
--     linkedin_inbox.body           -> message
--     tiktok_dm_conversations.tiktok_user_id -> tiktok_open_id
--
-- `linkedin_inbox.direction` y `.thread_id` no tienen equivalente: 507 las
-- invento obligatorias y el servicio nunca las contemplo.
--
-- NO se eliminan ni renombran, y no se inventa backfill: las columnas siguen
-- ahi para datos historicos y solo dejan de bloquear escrituras validas.
--
-- `DROP NOT NULL` falla si la tabla o la columna no existen, asi que se
-- comprueban ambas. La comprobacion es de EXISTENCIA, no un catch generico: un
-- error real de la sentencia sigue propagandose.

DO $$
DECLARE
  objetivo RECORD;
BEGIN
  FOR objetivo IN
    SELECT * FROM (VALUES
      ('pr_releases', 'body'),
      ('linkedin_outreach', 'message'),
      ('linkedin_inbox', 'body'),
      ('linkedin_inbox', 'direction'),
      ('linkedin_inbox', 'thread_id'),
      ('tiktok_dm_conversations', 'tiktok_user_id')
    ) AS t(tabla, columna)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = objetivo.tabla
        AND column_name = objetivo.columna
        AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP NOT NULL', objetivo.tabla, objetivo.columna);
    END IF;
  END LOOP;
END $$;

COMMENT ON COLUMN pr_releases.body IS
  'Legacy de 507. El cuerpo real vive en `content`; se conserva nullable por compatibilidad historica.';
COMMENT ON COLUMN linkedin_inbox.body IS
  'Legacy de 507. El texto real vive en `message`.';
