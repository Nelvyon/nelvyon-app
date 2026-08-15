-- 532 — Reconciliar las tablas que dos generaciones de esquema reclamaban.
--
-- EL PROBLEMA
-- -----------
-- Seis nombres de tabla tenian dos definiciones incompatibles: la que construye
-- esta cadena de migraciones (`tenant_id`, `id uuid`) y la que esperan el ORM y
-- `apps/web` (`workspace_id`, `id` entero). En produccion las tablas existen con
-- la forma que gano primero; al reconstruir desde cero gana la de las
-- migraciones, y sus consumidores dejan de funcionar. Lo que estaba roto no era
-- el producto: era poder rehacer la base desde el repositorio.
--
-- QUE SE MIDIO ANTES DE TOCAR NADA
-- --------------------------------
-- Para cada tabla se conto quien la lee y quien la escribe, en el backend
-- FastAPI y en `apps/web`:
--
--   deals             workspace_id 6 · tenant_id 0   ademas apps/web INSERTA con
--                                                    (user_id, workspace_id, title,
--                                                     value, currency, stage, ...)
--   calendar_events   workspace_id 7 · tenant_id 0
--   conversations     workspace_id 0 · tenant_id 0   ningun SQL crudo; solo ORM
--   social_posts      tenant_id 6 · workspace_id 3   -> la canonica es la MIGRADA;
--                                                    se corrige el modelo, no la tabla
--   audit_logs        tenant_id 4 · workspace_id 0   -> canonica la MIGRADA;
--                                                    se corrige el writer
--   subscriptions     apps/web usa `user_id = $1::uuid` y `plan`, columnas que la
--                     migracion 256 creo y que aqui NO se tocan
--
-- Por eso esta migracion solo actua sobre `deals`, `conversations` y
-- `subscriptions`. `audit_logs` se arregla en codigo, porque alli la tabla
-- tenia razon. `calendar_events` y `social_posts` quedan fuera a proposito:
-- ver el bloque de abajo y NELVYON_CLOSURE_STATE.md.
--
-- EL PATRON NO ES MIO: LO ESTABLECIO 506a
-- ---------------------------------------
-- `506a_reconcile_legacy_pre_507_social_posts.sql` resolvio exactamente este
-- problema para `social_posts`: renombrar la tabla legacy SOLO si esta vacia,
-- abortar en cualquier estado inesperado, y ni un DROP ni un DELETE. Aqui se
-- sigue el mismo patron para las dos tablas que 506a no cubre y que su nota
-- no prohibe.
--
-- POR QUE NO PUEDE PERDER DATOS
-- -----------------------------
-- No hay un solo DROP ni un solo DELETE.
--
-- Para las tres tablas que se apartan, la condicion es doble y se comprueba en
-- el momento: forma legacy (tiene `tenant_id`, no tiene `workspace_id`) Y CERO
-- filas. Con una sola fila la migracion NO toca nada y avisa, porque apartar una
-- tabla con datos exige una decision humana sobre esos datos.
--
-- Apartar es `ALTER TABLE ... RENAME TO <tabla>_saas_legacy`: la tabla sigue
-- existiendo, con su definicion y sus indices, bajo un nombre que ya no colisiona.
-- Es reversible con otro RENAME. Despues, `Base.metadata.create_all` crea la
-- canonica al arrancar la aplicacion, que es quien la crea hoy en produccion.
--
-- `subscriptions` NO se aparta: la comparten dos aplicaciones y las columnas de
-- `apps/web` estan en la definicion migrada. Se le anaden las que le faltan al
-- backend, y `plan_id` se rellena desde `plan`, que es el valor que `apps/web`
-- escribe de verdad. Aditivo y seguro tanto si la tabla es la migrada como si es
-- la del ORM: con `IF NOT EXISTS` lo que ya existe no se toca.

-- ─────────────────────────────── subscriptions: aditivo, nunca apartar

DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NULL THEN
    RAISE NOTICE '532: subscriptions no existe todavia; la creara create_all';
    RETURN;
  END IF;

  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id VARCHAR;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_paid DOUBLE PRECISION;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency VARCHAR;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS promo_code VARCHAR;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

  -- `plan_id` es lo que lee el backend; `plan` es lo que escribe apps/web. Son
  -- el mismo dato con dos nombres, asi que se copia en vez de inventarse. Sin
  -- esto, la resolucion de plan degrada a "starter" a todo cliente de pago.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'subscriptions'
       AND column_name = 'plan'
  ) THEN
    UPDATE subscriptions
       SET plan_id = plan
     WHERE plan_id IS NULL AND plan IS NOT NULL;
  END IF;
END $$;

-- ─────────────────────────────── deals / conversations

DO $$
DECLARE
  objetivo TEXT;
  filas BIGINT;
  apartadas INTEGER := 0;
  conservadas INTEGER := 0;
BEGIN
  -- `calendar_events` NO esta aqui, y no es un olvido: la migracion 506a deja
  -- escrito «Do NOT rename bookings / api_keys / calendar_events / invoices /
  -- audit_logs / qr_codes». Es una decision tomada antes, con contexto que el
  -- codigo no explica, y saltarsela seria exactamente renombrar a ciegas.
  -- Queda documentada como residuo en NELVYON_CLOSURE_STATE.md.
  FOREACH objetivo IN ARRAY ARRAY['deals', 'conversations']
  LOOP
    IF to_regclass('public.' || objetivo) IS NULL THEN
      RAISE NOTICE '532: % no existe; la creara create_all con la forma canonica', objetivo;
      CONTINUE;
    END IF;

    -- Forma legacy = tiene `tenant_id` y NO tiene `workspace_id`. Si ya tiene
    -- `workspace_id`, es la canonica y no hay nada que reconciliar.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = objetivo
         AND column_name = 'tenant_id'
    ) OR EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = objetivo
         AND column_name = 'workspace_id'
    ) THEN
      conservadas := conservadas + 1;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', objetivo) INTO filas;

    IF filas > 0 THEN
      RAISE NOTICE
        '532: % tiene la forma legacy y % filas; NO se toca. Apartar una tabla con datos exige decidir que pasa con esos datos.',
        objetivo, filas;
      conservadas := conservadas + 1;
      CONTINUE;
    END IF;

    -- Vacia y legacy: apartarla no puede perder nada. No se borra, se renombra.
    EXECUTE format('ALTER TABLE public.%I RENAME TO %I', objetivo, objetivo || '_saas_legacy');
    RAISE NOTICE '532: % apartada como %_saas_legacy (0 filas); create_all creara la canonica', objetivo, objetivo;
    apartadas := apartadas + 1;
  END LOOP;

  RAISE NOTICE '532: % apartadas, % conservadas', apartadas, conservadas;
END $$;

COMMENT ON COLUMN subscriptions.plan_id IS
  'Plan comercial que lee el backend FastAPI. Espejo de `plan`, que es lo que escribe apps/web.';
