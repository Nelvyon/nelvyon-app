-- 593 — `webhook_deliveries.webhook_id` tenia UN padre y hacian falta DOS.
--
-- QUE ESTABA ROTO
-- ----------------
-- Dos subsistemas independientes escriben en `webhook_deliveries`:
--
--   · el SaaS por inquilino (`backend/saas/SaasWebhooksService.ts`), cuyos
--     webhooks viven en `webhooks` (`tenant_id` -> `saas_tenants`);
--   · el de espacio de trabajo (`backend/services/webhook_service.py`), cuyos
--     endpoints viven en `webhook_endpoints` (`workspace_id` integer).
--
-- Son padres DISJUNTOS: ninguna fila de uno esta en el otro. Pero la tabla solo
-- tenia una columna de referencia, `webhook_id`, atada por la 405 a `webhooks`:
--
--     webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE
--
-- La 507 la habia redefinido con `endpoint_id -> webhook_endpoints`, pero llego
-- despues y con `CREATE TABLE IF NOT EXISTS`: no hizo nada. Su indice
-- `idx_webhook_deliveries_endpoint` tampoco existe en ninguna base — la prueba
-- de que aquel bloque no llego a ejecutarse.
--
-- Resultado: la ruta de espacio de trabajo mete el uuid de un `webhook_endpoint`
-- en una columna con clave foranea a `webhooks`. SIEMPRE viola la restriccion.
-- Ninguna entrega se registra; sin registro no hay reintento ni diagnostico. Es
-- el mismo fallo que la bateria de reintentos dice cerrar, una capa mas abajo.
--
-- POR QUE NO SE ARREGLA SIN MIGRACION
-- ------------------------------------
-- Se intento: el commit 8fa87cea alineo el escritor y el relector a la forma de
-- la 405 «sin necesitar una columna nueva». La premisa era falsa. Alinear los
-- NOMBRES no cambia a que tabla apunta la clave foranea, y `webhooks` exige un
-- `tenant_id` que un webhook de espacio de trabajo no tiene ni puede inventar.
-- Una columna no puede referenciar dos tablas: hacen falta dos columnas.
--
-- QUE HACE
-- ---------
--   1. anade `endpoint_id` con su clave foranea a `webhook_endpoints`;
--   2. quita el NOT NULL de `webhook_id`, que ahora solo usa la ruta SaaS;
--   3. exige que cada fila tenga EXACTAMENTE UNO de los dos, para que la tabla
--      no pueda quedar con entregas huerfanas ni con dos padres a la vez;
--   4. crea el indice que la 507 nunca llego a crear.
--
-- SOBRE LAS FILAS QUE YA HAY
-- ---------------------------
-- Ninguna, ni en local ni en produccion: las tres tablas estan a 0 (medido en
-- solo lectura el 2026-09-01). Pero la comprobacion se anade NOT VALID y se
-- valida despues, de modo que en cualquier base con historico las filas
-- existentes —`webhook_id` no nulo, `endpoint_id` nulo— la cumplen igualmente.
-- No se modifica ni una fila.
--
-- COSTE EXTERNO: 0 EUR.

ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS endpoint_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.webhook_deliveries'::regclass
       AND conname  = 'webhook_deliveries_endpoint_id_fkey'
  ) THEN
    ALTER TABLE public.webhook_deliveries
      ADD CONSTRAINT webhook_deliveries_endpoint_id_fkey
      FOREIGN KEY (endpoint_id) REFERENCES public.webhook_endpoints (id) ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE public.webhook_deliveries ALTER COLUMN webhook_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.webhook_deliveries'::regclass
       AND conname  = 'webhook_deliveries_un_solo_padre'
  ) THEN
    ALTER TABLE public.webhook_deliveries
      ADD CONSTRAINT webhook_deliveries_un_solo_padre
      CHECK ((webhook_id IS NULL) <> (endpoint_id IS NULL)) NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.webhook_deliveries VALIDATE CONSTRAINT webhook_deliveries_un_solo_padre;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint
  ON public.webhook_deliveries (endpoint_id, created_at DESC);
