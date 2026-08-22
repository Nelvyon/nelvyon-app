-- Indices de inquilino para las dos tablas sociales.
--
-- POR QUE APARECE AHORA
-- ---------------------
-- Las herramientas de redes que se anadieron al catalogo de agentes consultan
-- `social_auto_posts` y `social_auto_settings` filtrando por `workspace_id`, y
-- ninguna de las dos tiene un indice que lleve esa columna en primera posicion:
--
--     social_auto_posts     solo `id` (clave primaria)
--     social_auto_settings  solo `client_id` (clave primaria)
--
-- Lo detecto `test_pg_tenant_index_coverage`, un guard que ya existia. Es decir:
-- una bateria escrita antes caza una consecuencia de codigo escrito despues, que
-- es exactamente para lo que sirve.
--
-- POR QUE IMPORTA MAS DE LO QUE PARECE
-- -------------------------------------
-- Sin indice, cada consulta de un inquilino recorre las filas de TODOS. Con las
-- tablas vacias no se nota; con mil clientes publicando, cada peticion del panel
-- de uno paga el coste de los datos de los demas.
--
-- Y con RLS activo es peor: la politica se evalua fila a fila sobre todo lo que
-- el escaneo devuelve, asi que el trabajo desperdiciado se multiplica.
--
-- CONCURRENTLY, Y POR QUE NO AQUI
-- --------------------------------
-- `CREATE INDEX CONCURRENTLY` no puede ejecutarse dentro de un bloque
-- transaccional, y el runner de migraciones envuelve cada fichero en una. Las
-- dos tablas estan VACIAS en produccion —comprobado— asi que el indice se crea
-- al instante y el bloqueo dura lo que tarda en leerse una tabla sin filas.
--
-- Si alguna dia tuvieran volumen, esto habria que hacerlo fuera de la migracion.
-- Se anota para que la decision sea visible en vez de descubrirse con un bloqueo
-- en produccion.
--
-- ADITIVA. No toca ni una fila, ni una politica, ni un permiso.
--
-- ROLLBACK
--   DROP INDEX IF EXISTS public.ix_social_auto_posts_workspace;
--   DROP INDEX IF EXISTS public.ix_social_auto_settings_workspace;

DO $bloque_573$
DECLARE
    filas bigint;
BEGIN
    IF to_regclass('public.social_auto_posts') IS NOT NULL THEN
        SELECT count(*) INTO filas FROM public.social_auto_posts;
        IF filas > 100000 THEN
            RAISE NOTICE '573: social_auto_posts tiene % filas; crear el indice '
                         'aqui bloquearia escrituras. Se omite: hacerlo con '
                         'CREATE INDEX CONCURRENTLY fuera de la migracion', filas;
        ELSE
            CREATE INDEX IF NOT EXISTS ix_social_auto_posts_workspace
                ON public.social_auto_posts (workspace_id);
            RAISE NOTICE '573: indice de workspace en social_auto_posts (% filas)', filas;
        END IF;
    END IF;

    IF to_regclass('public.social_auto_settings') IS NOT NULL THEN
        SELECT count(*) INTO filas FROM public.social_auto_settings;
        IF filas > 100000 THEN
            RAISE NOTICE '573: social_auto_settings tiene % filas; se omite', filas;
        ELSE
            CREATE INDEX IF NOT EXISTS ix_social_auto_settings_workspace
                ON public.social_auto_settings (workspace_id);
            RAISE NOTICE '573: indice de workspace en social_auto_settings (% filas)', filas;
        END IF;
    END IF;
END
$bloque_573$;
