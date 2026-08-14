-- 535 — Cada generacion recupera su nombre.
--
-- EL PROBLEMA, Y POR QUE NO ERA «ELEGIR UNA»
-- ------------------------------------------
-- `conversations` y `deals` tenian dos definiciones incompatibles y las DOS
-- estaban vivas y con tests. Elegir una habria borrado funcionalidad real.
--
-- Pero no eran la misma entidad con dos formas: son dos generaciones distintas
-- del producto. Y la prueba no hay que deducirla, esta escrita en el codigo:
--
--     SaasDealsEtlService.ts:287
--         SELECT ... FROM deals WHERE workspace_id = $1
--     ...y escribe el resultado en `saas_deals`.
--
-- Un ETL entre las dos. Se unifica lo que es lo mismo, no lo que se traduce.
--
-- LA SEPARACION YA EXISTE, Y ESTA EN PRODUCCION CON DATOS
-- -------------------------------------------------------
-- Consultado en lectura sobre produccion:
--
--     contacts         ORM      filas=241   <- generacion workspace
--     saas_contacts    MIGRADA  filas=1     <- generacion tenant, prefijada
--     messages         ORM      filas=0
--     saas_deals       MIGRADA  filas=0
--     conversations    MIGRADA  filas=0     <- ANOMALIA
--     deals            MIGRADA  filas=0     <- ANOMALIA
--
-- El diseno intencionado es claro: la generacion tenant lleva prefijo `saas_`,
-- la generacion ORM/workspace va sin el. Las migraciones 401 y 402 se saltaron
-- esa convencion y crearon `conversations` y `deals` sin prefijo, invadiendo el
-- espacio de nombres de la otra generacion. De ahi salia todo:
--
--     - `/api/saas/inbox` -> 503 cuando ganaba la forma ORM
--     - los guards ORM<->PostgreSQL en rojo cuando ganaba la forma migrada
--
-- Ninguna de las dos podia estar bien a la vez, porque el conflicto no era de
-- forma: era de NOMBRE.
--
-- QUE HACE ESTA MIGRACION
-- -----------------------
-- Devuelve el prefijo a las tres tablas de la generacion tenant que lo habian
-- perdido. Al quedar libres los nombres sin prefijo, `create_all` crea las del
-- ORM —que es quien las crea hoy en produccion— y modelos y base vuelven a
-- coincidir sin tocar un solo modelo.
--
--     conversations          -> saas_conversations
--     conversation_messages  -> saas_conversation_messages
--     deals (forma pipeline) -> saas_pipeline_deals
--
-- `calendar_events` NO entra aqui, y merece explicacion porque lo parece. Su
-- modelo ORM ya fue alineado a la forma tenant en una fase anterior de esta
-- auditoria: `models/calendar_events.py` declara `tenant_id uuid` y documenta la
-- traduccion via `saas_tenants.workspace_id`. Alli la decision ya se tomo en el
-- sentido contrario —adaptar el modelo—, y es coherente. Por eso la 532 lo dejo
-- fuera a proposito. Renombrarla desharia esa decision.
--
-- `deals` merece una nota: la 402 lo creo con forma de pipeline
-- (`pipeline_id`, `stage_id`, `won_at`, `lost_reason`) y NO tiene ni un solo
-- consumidor, ni en TypeScript ni en `apps/web`. La tabla de deals de la
-- generacion tenant es `saas_deals` (migracion 312), que si tiene servicio,
-- ETL, forecast y dedupe. Asi que no se borra nada: se le da el nombre que le
-- corresponde y se libera el que estaba ocupando.
--
-- POR QUE NO PUEDE PERDER DATOS
-- -----------------------------
-- Ni un DROP ni un DELETE. Solo renombra, reversible con otro RENAME.
--
-- Cada tabla se comprueba en el momento antes de tocarla: forma correcta y CERO
-- filas. Con una sola fila no toca nada y avisa, porque mover una tabla con
-- datos exige una decision humana sobre esos datos. Es idempotente: si el
-- destino ya existe y el origen no, no hace nada.
--
-- Los indices, claves ajenas y politicas siguen a la tabla por OID, no por
-- nombre. La clave ajena de `saas_conversation_messages` seguira apuntando a
-- `saas_conversations` sola.

DO $$
DECLARE
  origen    text;
  destino   text;
  distintivo text;
  filas     bigint;
  par       text[];
BEGIN
  -- origen, destino, columna que confirma que es la tabla que creemos
  FOREACH par SLICE 1 IN ARRAY ARRAY[
    ARRAY['conversations',         'saas_conversations',         'tenant_id'],
    ARRAY['conversation_messages', 'saas_conversation_messages', 'tenant_id'],
    ARRAY['deals',                 'saas_pipeline_deals',        'pipeline_id']
  ] LOOP
    origen     := par[1];
    destino    := par[2];
    distintivo := par[3];

    IF to_regclass('public.' || origen) IS NULL THEN
      RAISE NOTICE '535: no existe %; nada que renombrar', origen;
      CONTINUE;
    END IF;

    IF to_regclass('public.' || destino) IS NOT NULL THEN
      RAISE NOTICE '535: % ya existe; se deja % como esta', destino, origen;
      CONTINUE;
    END IF;

    -- Solo si es de verdad la de la generacion tenant.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = origen AND column_name = distintivo
    ) THEN
      RAISE NOTICE '535: public.% no tiene %; es la del ORM, no se toca', origen, distintivo;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', origen) INTO filas;
    IF filas > 0 THEN
      RAISE NOTICE '535: public.% tiene % filas; NO se toca nada', origen, filas;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I RENAME TO %I', origen, destino);
    RAISE NOTICE '535: % -> % (0 filas)', origen, destino;

    -- Camino de ACTUALIZACION, no de base nueva.
    --
    -- En una base que ya paso por la 534 —staging— la tabla del ORM quedo
    -- guardada como `<tabla>_orm_legacy`. Ahora que el nombre esta libre se le
    -- devuelve, en vez de dejar que `create_all` cree una tercera copia y
    -- acaben conviviendo dos. En una base nueva ese `_orm_legacy` no existe y
    -- este bloque no hace nada: la crea `create_all` al arrancar, igual que en
    -- produccion.
    IF to_regclass('public.' || origen || '_orm_legacy') IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', origen || '_orm_legacy') INTO filas;
      IF filas > 0 THEN
        RAISE NOTICE '535: %_orm_legacy tiene % filas; se deja donde esta', origen, filas;
      ELSE
        EXECUTE format('ALTER TABLE public.%I RENAME TO %I', origen || '_orm_legacy', origen);
        RAISE NOTICE '535: %_orm_legacy recuperada como % (0 filas)', origen, origen;
      END IF;
    END IF;
  END LOOP;
END $$;
