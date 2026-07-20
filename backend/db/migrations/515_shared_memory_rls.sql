-- 515: RLS defensivo para Shared Memory (complementa filtros app-layer).
-- Idempotente. Requiere 514. Usa nelvyon_current_saas_tenant_uuid() de 311.

DO $$
BEGIN
  IF to_regclass('public.saas_shared_memory_entries') IS NULL THEN
    RAISE NOTICE '515: saas_shared_memory_entries missing — skip RLS';
    RETURN;
  END IF;

  ALTER TABLE saas_shared_memory_entries ENABLE ROW LEVEL SECURITY;
  ALTER TABLE saas_shared_memory_entries FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS saas_shared_memory_entries_saas_tenant ON saas_shared_memory_entries;
  CREATE POLICY saas_shared_memory_entries_saas_tenant ON saas_shared_memory_entries
    FOR ALL
    USING (tenant_id = public.nelvyon_current_saas_tenant_uuid())
    WITH CHECK (tenant_id = public.nelvyon_current_saas_tenant_uuid());

  IF to_regclass('public.saas_shared_memory_audit') IS NOT NULL THEN
    ALTER TABLE saas_shared_memory_audit ENABLE ROW LEVEL SECURITY;
    ALTER TABLE saas_shared_memory_audit FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS saas_shared_memory_audit_saas_tenant ON saas_shared_memory_audit;
    CREATE POLICY saas_shared_memory_audit_saas_tenant ON saas_shared_memory_audit
      FOR ALL
      USING (tenant_id = public.nelvyon_current_saas_tenant_uuid())
      WITH CHECK (tenant_id = public.nelvyon_current_saas_tenant_uuid());
  END IF;
END $$;

-- Soft FK: orphan audit rows kept if entry deleted (entry_id nullable). Index for joins.
CREATE INDEX IF NOT EXISTS idx_shared_memory_audit_entry
  ON saas_shared_memory_audit(entry_id)
  WHERE entry_id IS NOT NULL;
