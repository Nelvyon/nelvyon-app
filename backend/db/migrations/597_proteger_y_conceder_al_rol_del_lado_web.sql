-- 597 · Proteger y conceder. La mitad que solo puede mejorar las cosas.
--
-- POR QUE ESTA PARTIDA EN DOS
-- ---------------------------
-- Lo que necesita cada rol sale de leer las consultas del arbol. Eso ve lo que
-- esta escrito y NO ve una consulta cuyo nombre de tabla venga en una variable.
-- Las dos mitades no corren el mismo riesgo ante ese limite:
--
--   · CONCEDER de mas no rompe nada: como mucho sobra un permiso;
--   · REVOCAR de mas rompe una consulta que nadie vio venir, y en silencio
--     —«permission denied» en un camino concreto, no en el arranque—.
--
-- Por eso aqui van RLS y las concesiones. Las revocaciones esperan a la 598, al
-- momento del cutover, cuando el rol ya sirva trafico y un fallo se vea en
-- segundos en vez de en semanas.
--
-- LO QUE ESTA MIGRACION NO HACE
-- ------------------------------
-- No da LOGIN ni contrasena —una credencial no se escribe en el repositorio— y
-- no cambia `DATABASE_URL`. Hoy NADIE se conecta con estos roles: cero
-- conexiones vivas, medido en produccion. Es decir, esto es INERTE hasta el
-- cutover, y ese es exactamente el punto.
--
-- IMPACTO MEDIDO EN PRODUCCION: +31 permisos, 0 filas tocadas, 0 cambios de
-- esquema. La unica tabla alterada es `user_provider_api_keys`, con 0 filas.

-- ── ANTES DE CONCEDER: PROTEGER ─────────────────────────────────────────────
--
-- `user_provider_api_keys` guarda claves de proveedores de terceros por usuario
-- y NO tenia RLS. Conceder SELECT sobre ella habria dado a un rol de aplicacion
-- las claves de TODOS los clientes en cada lectura.
--
-- Lo encontro `ningunaTablaConDuenoSeQuedaSinRls` al probar esta misma
-- migracion: el guardian existia y cazo el fallo de quien lo escribio. Es la
-- razon de que el orden importe — se protege primero y se concede despues.
--
-- Se usa el patron por usuario de la 591, sin inventar nada: politicas de
-- SELECT/INSERT/UPDATE/DELETE contra `nelvyon_jwt_user_id()`.
DO $proteger_597$
DECLARE
  t text := 'user_provider_api_keys';
BEGIN
  IF to_regclass(format('public.%I', t)) IS NULL THEN
    RAISE NOTICE '597: %I no existe; nada que proteger', t;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'nelvyon_jwt_user_id'
  ) THEN
    RAISE NOTICE '597: falta nelvyon_jwt_user_id; no se activa RLS';
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_sel_propio') THEN
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING ((user_id)::text = (nelvyon_jwt_user_id())::text)', t||'_sel_propio', t);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_ins_propio') THEN
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK ((user_id)::text = (nelvyon_jwt_user_id())::text)', t||'_ins_propio', t);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_upd_propio') THEN
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING ((user_id)::text = (nelvyon_jwt_user_id())::text) WITH CHECK ((user_id)::text = (nelvyon_jwt_user_id())::text)', t||'_upd_propio', t);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_del_propio') THEN
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING ((user_id)::text = (nelvyon_jwt_user_id())::text)', t||'_del_propio', t);
  END IF;
END $proteger_597$;

DO $conceder_597$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT * FROM (VALUES
    ('GRANT','SELECT','os_service_requests','nelvyon_web_app'),
    ('GRANT','SELECT','saas_mcp_tool_audit','nelvyon_web_app'),
    ('GRANT','SELECT','user_provider_api_keys','nelvyon_web_app'),
    ('GRANT','INSERT','_migrations','nelvyon_web_app'),
    ('GRANT','INSERT','agrofood_results','nelvyon_web_app'),
    ('GRANT','INSERT','automotive_results','nelvyon_web_app'),
    ('GRANT','INSERT','coaching_results','nelvyon_web_app'),
    ('GRANT','INSERT','construction_results','nelvyon_web_app'),
    ('GRANT','INSERT','education_results','nelvyon_web_app'),
    ('GRANT','INSERT','fashion_results','nelvyon_web_app'),
    ('GRANT','INSERT','finance_results','nelvyon_web_app'),
    ('GRANT','INSERT','freelancers_results','nelvyon_web_app'),
    ('GRANT','INSERT','health_results','nelvyon_web_app'),
    ('GRANT','INSERT','home_results','nelvyon_web_app'),
    ('GRANT','INSERT','legal_results','nelvyon_web_app'),
    ('GRANT','INSERT','logistics_results','nelvyon_web_app'),
    ('GRANT','INSERT','media_results','nelvyon_web_app'),
    ('GRANT','INSERT','music_results','nelvyon_web_app'),
    ('GRANT','INSERT','ngo_results','nelvyon_web_app'),
    ('GRANT','INSERT','pharmacy_results','nelvyon_web_app'),
    ('GRANT','INSERT','startups_results','nelvyon_web_app'),
    ('GRANT','INSERT','tourism_results','nelvyon_web_app'),
    ('GRANT','INSERT','user_provider_api_keys','nelvyon_web_app'),
    ('GRANT','INSERT','user_roles','nelvyon_web_app'),
    ('GRANT','INSERT','veterinary_results','nelvyon_web_app'),
    ('GRANT','INSERT','wellness_results','nelvyon_web_app'),
    ('GRANT','UPDATE','store_settings','nelvyon_web_app'),
    ('GRANT','DELETE','saas_agent_runs','nelvyon_web_app'),
    ('GRANT','DELETE','user_provider_api_keys','nelvyon_web_app'),
    ('GRANT','SELECT','os_service_requests','nelvyon_web_jobs'),
    ('GRANT','SELECT','waitlist','nelvyon_web_jobs')
    ) AS t(accion, priv, tabla, rol)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = f.tabla
    ) THEN
      IF f.accion = 'GRANT' THEN
        EXECUTE format('GRANT %s ON TABLE public.%I TO %I', f.priv, f.tabla, f.rol);
      ELSE
        EXECUTE format('REVOKE %s ON TABLE public.%I FROM %I', f.priv, f.tabla, f.rol);
      END IF;
    END IF;
  END LOOP;
END $conceder_597$;
