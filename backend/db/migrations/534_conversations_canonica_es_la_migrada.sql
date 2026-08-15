-- 534 — Devolver `conversations` a la forma que tiene produccion.
--
-- QUE SE ROMPIO
-- -------------
-- La migracion 532 aparto `conversations` como `conversations_saas_legacy` para
-- que `create_all` creara la version del ORM (`id` entero, `workspace_id`). Lo
-- decidio a partir de este recuento, escrito en su propia cabecera:
--
--     conversations   workspace_id 0 · tenant_id 0   ningun SQL crudo; solo ORM
--
-- El recuento era falso. Hay VEINTIDOS referencias en SQL crudo, todas por
-- `tenant_id`, en codigo TypeScript que el barrido de entonces no miro:
--
--     backend/saas/SaasInboxService.ts          (buzon unificado)
--     backend/saas/SaasWhatsAppService.ts
--     backend/saas/SaasWhatsAppCloudService.ts
--
-- Consecuencia medida en staging: `/api/saas/inbox` devuelve 503
-- `SCHEMA_MISMATCH`, porque la consulta hace `FROM conversations c WHERE
-- c.tenant_id = $1` sobre una tabla que ya no tiene esa columna.
--
-- LO MISMO PASA CON `deals`
-- -------------------------
-- La 532 tambien la aparto. Sus consumidores de SQL crudo estan repartidos:
-- `routers/deals.py` y `apps/web/src/lib/platformDbFallback.ts` usan
-- `workspace_id`; `backend/saas/SaasCampaniasService.ts` usa `tenant_id`. Son
-- dos generaciones del producto compartiendo un nombre de tabla, y ninguna
-- forma contenta a las dos.
--
-- QUE DICE PRODUCCION, QUE ES EL ARBITRO
-- --------------------------------------
-- Consultado en lectura, solo `information_schema` y `count(*)`:
--
--     conversations      MIGRADA  id=uuid  filas=0
--     deals              MIGRADA  id=uuid  filas=0
--     calendar_events    MIGRADA  id=uuid  filas=0
--     social_posts       MIGRADA  id=uuid  filas=0
--     audit_logs         MIGRADA  id=uuid  filas=0
--     subscriptions      ORM      id=uuid  filas=0
--
-- La canonica en produccion es la MIGRADA para las dos que la 532 aparto. Alli
-- no llego a apartar nada —su condicion exige forma legacy y no se cumple—, asi
-- que el desvio solo aparece al RECONSTRUIR la base desde el repositorio. Y eso
-- es exactamente lo que hace un entorno nuevo como staging: reconstruirla.
--
-- Dicho de otro modo, lo que estaba roto no era produccion: era que el
-- repositorio dejo de saber reproducirla.
--
-- Es el mismo criterio que la propia 532 aplico a `social_posts` y `audit_logs`:
-- cuando la tabla migrada es la que refleja produccion, la canonica es la
-- migrada y lo que se corrige es el modelo.
--
-- `subscriptions` se queda como esta: en produccion es la del ORM y la 532 no
-- la aparto.
--
-- LO QUE ESTO NO ARREGLA, Y HAY QUE DECIDIR
-- -----------------------------------------
-- Que `routers/conversations.py` y `routers/deals.py` consulten por
-- `workspace_id` columnas que la tabla canonica no tiene. Eso YA ocurre en
-- produccion hoy: esta migracion no lo empeora ni lo mejora, solo deja de
-- ocultarlo detras de una base reconstruida distinta de la real. Elegir que
-- generacion sobrevive —o separarlas en tablas propias— es una decision de
-- producto, no de migracion.
--
-- POR QUE NO PUEDE PERDER DATOS
-- -----------------------------
-- Ni un DROP ni un DELETE. Solo renombra, que es reversible con otro RENAME.
--
-- Actua unicamente si TODO se cumple, comprobado en el momento:
--   - existe `conversations_saas_legacy` con forma migrada y CERO filas
--   - existe `conversations` con forma de ORM y CERO filas
--   - no existe ya `conversations_orm_legacy`
--
-- Con una sola fila en cualquiera de las dos, no toca nada y avisa: apartar una
-- tabla con datos exige una decision humana sobre esos datos.
--
-- En produccion es un no-op: `conversations_saas_legacy` no existe alli.
--
-- La clave ajena de `conversation_messages` sigue a la tabla por OID, no por
-- nombre, asi que vuelve a apuntar a `conversations` sola.

DO $$
DECLARE
  objetivo             text;
  apartada             text;
  destino              text;
  legacy_tiene_tenant  boolean;
  orm_tiene_workspace  boolean;
  filas_legacy         bigint;
  filas_orm            bigint;
BEGIN
  -- Las dos que la 532 aparto y que en produccion son la forma MIGRADA.
  -- `subscriptions` NO esta aqui: la 532 no la aparto, y en produccion es la del
  -- ORM. Se queda como esta.
  FOREACH objetivo IN ARRAY ARRAY['conversations', 'deals'] LOOP
    apartada := objetivo || '_saas_legacy';
    destino  := objetivo || '_orm_legacy';

    IF to_regclass('public.' || apartada) IS NULL THEN
      RAISE NOTICE '534: no existe %; nada que reconciliar (caso produccion)', apartada;
      CONTINUE;
    END IF;

    IF to_regclass('public.' || destino) IS NOT NULL THEN
      RAISE EXCEPTION '534 aborta: public.% ya existe', destino;
    END IF;

    -- La apartada tiene que ser de verdad la migrada.
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = apartada AND column_name = 'tenant_id'
    ) INTO legacy_tiene_tenant;

    IF NOT legacy_tiene_tenant THEN
      RAISE EXCEPTION '534 aborta: % no tiene tenant_id; forma inesperada', apartada;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', apartada) INTO filas_legacy;
    IF filas_legacy > 0 THEN
      RAISE NOTICE '534: % tiene % filas; NO se toca nada', apartada, filas_legacy;
      CONTINUE;
    END IF;

    IF to_regclass('public.' || objetivo) IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = objetivo AND column_name = 'workspace_id'
      ) INTO orm_tiene_workspace;

      IF NOT orm_tiene_workspace THEN
        RAISE NOTICE '534: public.% ya es la migrada; nada que hacer', objetivo;
        CONTINUE;
      END IF;

      EXECUTE format('SELECT count(*) FROM public.%I', objetivo) INTO filas_orm;
      IF filas_orm > 0 THEN
        RAISE NOTICE '534: public.% (ORM) tiene % filas; NO se toca nada', objetivo, filas_orm;
        CONTINUE;
      END IF;

      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', objetivo, destino);
      RAISE NOTICE '534: % (ORM, 0 filas) apartada como %', objetivo, destino;
    END IF;

    EXECUTE format('ALTER TABLE public.%I RENAME TO %I', apartada, objetivo);
    RAISE NOTICE '534: % restaurada como % (canonica, como produccion)', apartada, objetivo;
  END LOOP;
END $$;
