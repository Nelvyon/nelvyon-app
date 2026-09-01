-- 592 — RLS para las 5 tablas que la 567 salto por tener filas.
--
-- QUE SE ENCONTRO, Y POR QUE NO SE VEIA
-- --------------------------------------
-- La 567 aplica RLS en masa a las tablas SaaS, pero salta a proposito las que
-- tienen datos:
--
--     IF tiene_filas THEN … '567: % tiene filas; pertenece a otro lote' … CONTINUE
--
-- Fue una decision prudente —no tocar tablas pobladas en un barrido automatico—
-- y el «otro lote» nunca llego.
--
-- El efecto secundario es que ESTE DEFECTO SOLO EXISTE EN PRODUCCION. En una
-- base local recien migrada esas mismas tablas estan VACIAS, asi que la 567 SI
-- las cubre y cualquier auditoria local las ve protegidas. La unica forma de
-- encontrarlas fue preguntarselo a produccion en solo lectura.
--
-- Quedaron 5, con 2.962 filas entre todas:
--
--     os_sector_shield_audits     2.761
--     saas_pack_entitlements        172
--     saas_tenants                   22   ← y con SELECT concedido a `anon`
--     saas_autopilot_settings         6
--     saas_activation_checklist       1
--
-- CADA UNA LLEVA LA POLITICA DE SU FAMILIA, NO UNA COPIADA
-- --------------------------------------------------------
-- Poner «RLS por poner» habria sido peor que no ponerlo: una politica por
-- `tenant_id` sobre una tabla cuyo `tenant_id` esta a NULL no aisla, hace
-- DESAPARECER las filas para todo el mundo. Asi que el sujeto de cada una se
-- derivo mirando que columna esta poblada de verdad y a que apunta.
--
-- Los predicados no se inventan: son los que el catalogo ya usa, con el numero
-- de tablas reales que los respaldan.
--
--   os_sector_shield_audits   POR WORKSPACE  (familia OS, 115 tablas)
--       `tenant_id` esta a NULL en las 2.761 filas — es la deuda que la 574
--       intento reatribuir y no pudo. `workspace_id` esta poblado en las 2.761.
--       Una politica por `tenant_id` aqui habria escondido la tabla entera.
--
--   saas_pack_entitlements    POR TENANT UUID (familia SaaS, 145 tablas)
--   saas_autopilot_settings   POR TENANT UUID (idem)
--       `tenant_id uuid`, poblado al 100 %.
--
--   saas_activation_checklist POR TENANT TEXTO (familia SaaS texto, 3 tablas)
--       Su `tenant_id` es TEXT, no uuid. Se compara con el uuid actual
--       convertido a texto, que es lo que hacen esas 3.
--
--   saas_tenants              POR USUARIO     (familia usuario, 247 tablas)
--       `user_id` poblado al 100 %, con clave foranea a `nelvyon_users`.
--       `workspace_id` solo esta en 2 de 22, asi que NO sirve de sujeto.
--
-- LA COMPROBACION QUE PODIA ROMPERLO TODO
-- ----------------------------------------
-- `saas_tenants` es lo que lee `nelvyon_current_saas_tenant_uuid()`, y de esa
-- funcion dependen 596 politicas de otras tablas. Si al activar RLS la funcion
-- dejara de encontrar su fila, TODAS esas tablas devolverian cero.
--
-- No pasa, y se comprobo en vez de suponerlo: la funcion es SECURITY DEFINER y
-- su propietario es `postgres`, que es superusuario y salta RLS. Sigue viendo
-- la fila. Lo mismo para `nelvyon_user_in_workspace` y
-- `nelvyon_workspace_can_mutate`.
--
-- Las ~100 claves foraneas que apuntan a `saas_tenants` tampoco se ven
-- afectadas: PostgreSQL ejecuta las comprobaciones de integridad referencial
-- con los privilegios del propietario y sin aplicar RLS.
--
-- FORCE EN LAS CINCO
-- ------------------
-- Es lo que hacen 589 de las 656 tablas con RLS de esta base, y lo que hizo la
-- 591. Hoy es inerte —el propietario es `postgres`, superusuario, que salta RLS
-- con FORCE o sin el— pero deja de serlo el dia que el propietario no lo sea.
-- No se encontro ninguna razon legitima para dejarlo fuera en ninguna de las 5.
--
-- NINGUN INDICE NUEVO
-- -------------------
-- Comprobado tabla por tabla: las cinco YA tienen un indice que empieza por su
-- columna de sujeto. El bloque de abajo esta acotado EXACTAMENTE a estas cinco
-- —la 591 tuvo el defecto de no acotarlo y habria tocado 59 tablas ajenas— y
-- crea cero. Se deja escrito para que siga comprobandose si el esquema cambia.
--
-- POR QUE ESTO NO ROMPE NADA HOY
-- ------------------------------
-- La aplicacion se conecta como `postgres`, superusuario con BYPASSRLS. Para el
-- servicio en marcha esta migracion es un no-op: no cambia ni una respuesta.
--
-- LO QUE SI CAMBIA EL DIA DEL CUTOVER, y hay que tenerlo escrito:
--
--   · 15 filas quedan sin sujeto vivo — 10 de `saas_pack_entitlements` y 5 de
--     `saas_autopilot_settings`—: su `tenant_id` no corresponde a ningun
--     inquilino, ni workspace, ni usuario existente. Son residuo de inquilinos
--     borrados. Dejan de verse por los roles de aplicacion y siguen ahi para
--     el rol de trabajos y para mantenimiento. La alternativa —no poner RLS—
--     seria que TODOS los inquilinos las vieran, que es peor.
--
--   · dos crons leen `saas_tenants` de punta a punta
--     (`/api/cron/saas-competitor-gap` y `/api/cron/os-recurring-services`) y
--     usan `DbClient`, no `DbJobsClient`. Con el rol `nelvyon_web_app` verian
--     cero. Tienen que pasar a `DbJobsClient` ANTES del cutover. No es un
--     problema de esta migracion —ya estaban en la lista de rutas entre
--     inquilinos— pero esta migracion es la que lo convierte en bloqueante.
--
-- IDEMPOTENTE. `DROP POLICY IF EXISTS` antes de crear; `ENABLE ROW LEVEL
-- SECURITY` sobre una tabla que ya lo tiene es un no-op.

DO $bloque_592$
DECLARE
    objetivo  text;
    sujeto    text;
    leer      text;
    escribir  text;
    aplicadas int := 0;
    omitidas  int := 0;
    huerfanas int;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'nelvyon_current_saas_tenant_uuid'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'nelvyon_os_workspace_select'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'nelvyon_jwt_user_id'
    ) THEN
        -- Sin las funciones, las politicas quedarian sin poder evaluarse y con
        -- FORCE eso significa cero filas para todos, incluido el propietario.
        RAISE NOTICE '592: faltan funciones de sujeto; no se aplica nada';
        RETURN;
    END IF;

    -- tabla | columna de sujeto | predicado de LECTURA | predicado de MUTACION
    FOR objetivo, sujeto, leer, escribir IN
        SELECT * FROM (VALUES
            ('os_sector_shield_audits', 'workspace_id',
             'nelvyon_os_workspace_select(workspace_id)',
             'nelvyon_os_workspace_mutate(workspace_id)'),
            ('saas_pack_entitlements', 'tenant_id',
             'tenant_id = nelvyon_current_saas_tenant_uuid()',
             'tenant_id = nelvyon_current_saas_tenant_uuid()'),
            ('saas_autopilot_settings', 'tenant_id',
             'tenant_id = nelvyon_current_saas_tenant_uuid()',
             'tenant_id = nelvyon_current_saas_tenant_uuid()'),
            ('saas_activation_checklist', 'tenant_id',
             'tenant_id = (nelvyon_current_saas_tenant_uuid())::text',
             'tenant_id = (nelvyon_current_saas_tenant_uuid())::text'),
            ('saas_tenants', 'user_id',
             '(user_id)::text = (nelvyon_jwt_user_id())::text',
             '(user_id)::text = (nelvyon_jwt_user_id())::text')
        ) AS t(tabla, col, sel, mut)
    LOOP
        IF to_regclass(format('public.%I', objetivo)) IS NULL THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '592: % no existe; se omite', objetivo;
            CONTINUE;
        END IF;

        -- La columna de sujeto tiene que existir. Una politica sobre una columna
        -- que no esta deja la tabla ilegible para todos, no protegida.
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = objetivo AND column_name = sujeto
        ) THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '592: % no tiene columna %; se omite', objetivo, sujeto;
            CONTINUE;
        END IF;

        -- Y tiene que estar POBLADA. Este es el control que impide repetir el
        -- error que habria cometido una politica por `tenant_id` sobre
        -- `os_sector_shield_audits`: alli el sujeto esta a NULL en las 2.761
        -- filas y la tabla entera habria desaparecido.
        EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IS NULL', objetivo, sujeto)
           INTO huerfanas;
        IF huerfanas > 0 THEN
            RAISE EXCEPTION
                '592: %.% esta a NULL en % filas: esa politica las esconderia en vez de aislarlas',
                objetivo, sujeto, huerfanas;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', objetivo);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', objetivo);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', objetivo || '_592_sel', objetivo);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', objetivo || '_592_ins', objetivo);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', objetivo || '_592_upd', objetivo);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', objetivo || '_592_del', objetivo);

        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (%s)',
                       objetivo || '_592_sel', objetivo, leer);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%s)',
                       objetivo || '_592_ins', objetivo, escribir);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (%s) WITH CHECK (%s)',
                       objetivo || '_592_upd', objetivo, escribir, escribir);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (%s)',
                       objetivo || '_592_del', objetivo, escribir);

        aplicadas := aplicadas + 1;
    END LOOP;

    RAISE NOTICE '592: RLS aplicada a % tablas (% omitidas)', aplicadas, omitidas;
END
$bloque_592$;

-- Los indices que sostienen estas politicas, ACOTADO A LAS CINCO.
--
-- Comprobado en produccion: las cinco YA tienen un indice que empieza por su
-- columna de sujeto, asi que esto crea CERO. Se deja escrito porque el dia que
-- alguien anada una tabla a la lista de arriba tiene que crearse el suyo, y
-- porque el bloque equivalente de la 591 no estaba acotado y habria tocado 59
-- tablas que no eran suyas.
DO $indices_592$
DECLARE
    objetivo text;
    sujeto   text;
    creados  int := 0;
BEGIN
    FOR objetivo, sujeto IN
        SELECT * FROM (VALUES
            ('os_sector_shield_audits',   'workspace_id'),
            ('saas_pack_entitlements',    'tenant_id'),
            ('saas_autopilot_settings',   'tenant_id'),
            ('saas_activation_checklist', 'tenant_id'),
            ('saas_tenants',              'user_id')
        ) AS t(tabla, col)
    LOOP
        IF to_regclass(format('public.%I', objetivo)) IS NULL THEN
            CONTINUE;
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
              JOIN pg_index i ON i.indrelid = c.oid
              JOIN pg_attribute ia ON ia.attrelid = i.indrelid AND ia.attnum = i.indkey[0]
             WHERE c.relname = objetivo AND ia.attname = sujeto
        ) THEN
            CONTINUE;
        END IF;
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
                       objetivo || '_592_idx', objetivo, sujeto);
        creados := creados + 1;
    END LOOP;
    RAISE NOTICE '592: % indices creados (se esperaban 0: las cinco ya lo tenian)', creados;
END
$indices_592$;
