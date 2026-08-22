-- RLS para las tablas OS que SI tienen datos en produccion.
--
-- POR QUE ESTE LOTE ES DISTINTO A TODOS LOS ANTERIORES
-- -----------------------------------------------------
-- Los lotes 560, 562, 563, 566, 567 y 568 solo tocaban tablas VACIAS, donde
-- activar RLS no puede ocultarle datos a nadie porque no hay datos. Aqui si los
-- hay: 14.178 eventos de auditoria, 1.101 clientes, 1.319 campanas.
--
-- Sobre datos existentes, RLS puede hacer algo peor que fallar: puede volverlos
-- INVISIBLES sin dar ningun error. Una consulta devuelve cero filas, el panel
-- muestra un cero, y nadie sabe que la informacion sigue ahi.
--
-- Por eso este lote lleva DOS guardas que los anteriores no necesitaban.
--
-- QUINTA GUARDA: NINGUNA FILA CON `workspace_id` NULO
-- ---------------------------------------------------
-- La politica compara `workspace_id`. Una fila con NULL no la satisface nunca, y
-- quedaria oculta para todo el mundo de forma permanente.
--
-- Esto NO es hipotetico. Se midio en produccion:
--     os_sector_shield_audits   2761 filas, LAS 2761 con workspace_id NULL
--     saas_tenants              22 filas, 20 con workspace_id NULL
-- Las dos quedan fuera de este lote por esta guarda, y necesitan que alguien
-- decida antes a que inquilino pertenecen esas filas.
--
-- SEXTA GUARDA: EL WORKSPACE DUENNO TIENE ALGUIEN QUE PUEDA VERLO
-- ----------------------------------------------------------------
-- `nelvyon_os_workspace_select` concede por PERTENENCIA. Un workspace sin
-- miembros activos no satisface la politica para nadie, asi que proteger una
-- tabla cuyos datos pertenecen a un workspace huerfano equivale a esconderlos.
--
-- Medido: las 10 tablas de este lote tienen todos sus datos en el workspace 1,
-- que existe, esta activo, tiene titular y UN miembro activo. Los workspaces 2 y
-- 3 tienen cero miembros activos: si alguna tabla apuntara a ellos, esta guarda
-- la omitiria.
--
-- LAS OTRAS CUATRO SIGUEN
-- -----------------------
-- existe / es INTEGER / sin otra familia de politicas. La de «esta vacia» se
-- sustituye aqui, a proposito, por las dos de arriba: este lote existe
-- precisamente para las que NO estan vacias.
--
-- ADITIVA. No toca ni una fila. Solo cambia quien puede verlas.
--
-- ROLLBACK
--   ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.<t> NO FORCE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS <t>_os_select ON public.<t>;   (y _mutate)

DO $bloque_569$
DECLARE
    t text;
    tipo text;
    nulos bigint;
    huerfanos bigint;
    aplicadas int := 0;
    omitidas int := 0;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'os_agent_audit_events', 'os_qa_audit_runs', 'os_truth_guard_audits',
        'nelvyon_campaigns', 'nelvyon_pack_runs', 'nelvyon_clients',
        'email_queue', 'os_delivery_certificates',
        'os_deliverable_approval_tokens', 'contacts',
        -- Se incluyen a proposito para que las guardas las NOMBREN al omitirlas,
        -- en vez de que desaparezcan en silencio del inventario.
        'os_sector_shield_audits', 'saas_tenants'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '569: % no existe; se omite', t;
            CONTINUE;
        END IF;

        SELECT data_type INTO tipo
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t
           AND column_name = 'workspace_id';

        IF tipo IS DISTINCT FROM 'integer' THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '569: %.workspace_id es % y no integer; se omite', t, tipo;
            CONTINUE;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = t
                      AND p.policyname NOT LIKE t || '\_os\_%') THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '569: % ya la protege otra familia; anadir la nuestra la '
                         'ensancharia', t;
            CONTINUE;
        END IF;

        -- Quinta guarda: filas que la politica no podria satisfacer nunca.
        EXECUTE format('SELECT count(*) FROM public.%I WHERE workspace_id IS NULL', t)
           INTO nulos;
        IF nulos > 0 THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '569: % tiene % filas con workspace_id NULL; activar RLS '
                         'las ocultaria para siempre y sin error. Se omite hasta '
                         'que se decida de quien son', t, nulos;
            CONTINUE;
        END IF;

        -- Sexta guarda: datos cuyo duenno no tiene a nadie que pueda verlos.
        EXECUTE format(
            'SELECT count(DISTINCT x.workspace_id) FROM public.%I x '
            ' WHERE NOT EXISTS (SELECT 1 FROM public.workspace_members m '
            '                    WHERE m.workspace_id = x.workspace_id '
            '                      AND m.status = ''active'')', t)
           INTO huerfanos;
        IF huerfanos > 0 THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '569: % tiene datos en % workspace(s) sin miembros '
                         'activos; protegerla los escondería de todos. Se omite',
                         t, huerfanos;
            CONTINUE;
        END IF;

        PERFORM public.nelvyon_apply_os_workspace_rls(t);
        aplicadas := aplicadas + 1;
    END LOOP;

    RAISE NOTICE '569: RLS aplicado a % tablas con datos, % omitidas',
                 aplicadas, omitidas;
END
$bloque_569$;
