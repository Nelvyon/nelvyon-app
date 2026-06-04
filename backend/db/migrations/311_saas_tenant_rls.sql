-- Fase 1A: RLS defensivo en tablas SaaS (complementa filtros en aplicación con service_role).

CREATE OR REPLACE FUNCTION public.nelvyon_current_saas_tenant_uuid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT st.id
  FROM public.saas_tenants st
  WHERE st.user_id = public.nelvyon_jwt_user_id()
  LIMIT 1;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'saas_contacts',
    'saas_contact_activities',
    'saas_workflows',
    'saas_workflow_runs',
    'saas_campanias',
    'saas_campania_recipients',
    'saas_activity_log'
  ])
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_saas_tenant ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_saas_tenant ON %I FOR ALL
       USING (tenant_id = public.nelvyon_current_saas_tenant_uuid())
       WITH CHECK (tenant_id = public.nelvyon_current_saas_tenant_uuid())',
      tbl,
      tbl
    );
  END LOOP;
END $$;
