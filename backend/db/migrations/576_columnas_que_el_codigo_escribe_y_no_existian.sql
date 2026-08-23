-- 576 — las columnas que el código escribe y la cadena de migraciones no creaba.
--
-- QUÉ ARREGLA
-- ===========
-- Cinco INSERT de código vivo citan columnas que no existen. No es una
-- suposición: se midió reconstruyendo una base VIRGEN solo con la cadena
-- oficial de migraciones y contrastando contra ella cada `INSERT INTO ... (...)`
-- del árbol.
--
--   security_events    message, metadata     backend/services/web_performance_service.py
--   campaigns          from_email, from_name backend/services/campaign_service.py
--   affiliate_clicks   affiliate_id          backend/services/affiliate_service.py
--   saas_conversations metadata              backend/saas/SaasWhatsAppService.ts
--                                            backend/saas/SaasWhatsAppCloudService.ts
--   retail_results     sector, output        apps/web/src/pages/api/os/agents/retail.ts
--
-- Cada uno de esos INSERT falla hoy con «column does not exist». No es un hueco
-- de recuperación teórico: es funcionalidad que no funciona. Verificado a mano en
-- tres de los cinco leyendo el `pg_attribute` de la tabla.
--
-- `security_events` es el caso distinto: producción SÍ tiene `message` y
-- `metadata` —vienen de la rama antigua de alembic, no de la cadena SQL— así que
-- allí esta migración no cambia nada. Lo que arregla es que una restauración
-- desde cero produzca el mismo esquema.
--
-- QUÉ NO ARREGLA, Y POR QUÉ
-- =========================
-- Se quedan fuera, a propósito, los que no son «falta una columna» sino una
-- decisión:
--
--   chatbot_conversations.workspace_id
--     En una tabla de inquilino eso no es un campo más: decide el aislamiento y
--     arrastra una política de RLS. Añadirla sin decidir su política sería
--     inventar semántica de tenencia.
--
--   invoices (7 columnas) y ab_tests (4)
--     El servicio escribe una forma y la tabla tiene otra. TRES migraciones
--     crean `invoices` —054, 415 y 507— y gana la primera por `IF NOT EXISTS`;
--     por eso conviven `invoices_pkey` e `invoices_pkey1`. Existe además
--     `saas_invoices`. Eso no se arregla añadiendo columnas: hay que decidir a
--     qué tabla pertenece cada servicio, y eso es alcance de producto.
--
-- SEGURIDAD DE ESTA MIGRACIÓN
-- ===========================
-- - Solo `ADD COLUMN IF NOT EXISTS`. No borra, no renombra, no mueve datos.
-- - Idempotente: aplicarla dos veces da el mismo resultado.
-- - Sin backfill. Las filas existentes quedan con NULL, que es exactamente lo
--   que tenían antes: nada.
-- - Ninguna columna es `NOT NULL`, así que no puede fallar por filas previas.
-- - En producción, `security_events` ya las tiene: allí esas dos líneas son un
--   no-op y el resto son columnas nuevas y vacías.
--
-- Los tipos salen de cómo las usa el código, no de una preferencia:
--   `metadata` es `jsonb` porque `web_performance_service` hace
--   `CAST(:meta AS jsonb)` y `SaasWhatsAppService` la consulta con `->>`.
--   `output` es `jsonb` porque `retail.ts` hace `$5::jsonb`.
--   `affiliate_id` es `uuid` porque el INSERT hace `CAST(:aid AS uuid)`.

BEGIN;

-- ── security_events ────────────────────────────────────────────────────────
-- Producción ya las tiene; esto iguala la cadena de migraciones con ella.
ALTER TABLE IF EXISTS public.security_events
  ADD COLUMN IF NOT EXISTS message  text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- ── campaigns ──────────────────────────────────────────────────────────────
-- Remitente de la campaña. Sin estas dos, crear una campaña falla entero.
ALTER TABLE IF EXISTS public.campaigns
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS from_name  text;

-- ── affiliate_clicks ───────────────────────────────────────────────────────
-- Sin esto un clic no se puede atribuir a su afiliado. La tabla tiene `code`,
-- que también identifica al afiliado, pero el código escribe el id y falla.
ALTER TABLE IF EXISTS public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS affiliate_id uuid;

-- ── saas_conversations ─────────────────────────────────────────────────────
-- `SaasWhatsAppService` guarda ahí el destinatario y luego lo busca con
-- `metadata->>'wa_to'`: sin la columna, ni se guarda ni se encuentra.
ALTER TABLE IF EXISTS public.saas_conversations
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- ── retail_results ─────────────────────────────────────────────────────────
-- La tabla tiene `result`; el agente escribe `output`. Se añade `output` en vez
-- de renombrar `result`: renombrar rompería a quien ya lea `result`, y aquí no
-- hay forma de saber quién lo hace sin decidir por el fundador.
ALTER TABLE IF EXISTS public.retail_results
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS output jsonb;

COMMIT;
