-- Fase 3A: RLS para saas_deals (mismo patrón que saas_contacts)

DO $$
BEGIN
  IF to_regclass('public.saas_deals') IS NULL THEN
    RAISE NOTICE 'saas_deals no existe; omitir RLS 313';
    RETURN;
  END IF;
  ALTER TABLE saas_deals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE saas_deals FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS saas_deals_saas_tenant ON saas_deals;
  CREATE POLICY saas_deals_saas_tenant ON saas_deals FOR ALL
    USING (tenant_id = public.nelvyon_current_saas_tenant_uuid())
    WITH CHECK (tenant_id = public.nelvyon_current_saas_tenant_uuid());
END $$;
