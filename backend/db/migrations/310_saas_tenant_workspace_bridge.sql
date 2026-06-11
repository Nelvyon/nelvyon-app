-- Fase 1A: puente oficial workspace_id (legacy INTEGER) ↔ saas_tenants.id (UUID)
-- Regla: 1 saas_tenant por user_id; workspace_id = workspace primario (menor id) del usuario.
-- `workspaces` es SSOT FastAPI (Alembic). Backfill condicional si la tabla aún no existe.

ALTER TABLE saas_tenants
  ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_tenants_workspace_id
  ON saas_tenants (workspace_id)
  WHERE workspace_id IS NOT NULL;

COMMENT ON COLUMN saas_tenants.workspace_id IS
  'Legacy FastAPI workspace (INTEGER). Fuente de mapeo con saas_tenants.id para CRM, métricas y cuotas.';

DO $$
BEGIN
  IF to_regclass('public.workspaces') IS NULL THEN
    RAISE NOTICE '310: skip backfill — public.workspaces not present (run alembic upgrade head first)';
    RETURN;
  END IF;

  UPDATE saas_tenants st
  SET workspace_id = sub.wid,
      updated_at = NOW()
  FROM (
    SELECT
      st2.id AS tenant_pk,
      (
        SELECT w.id
        FROM public.workspaces w
        WHERE w.user_id = st2.user_id::text
        ORDER BY w.id ASC
        LIMIT 1
      ) AS wid
    FROM saas_tenants st2
    WHERE st2.workspace_id IS NULL
  ) sub
  WHERE st.id = sub.tenant_pk
    AND sub.wid IS NOT NULL
    AND st.workspace_id IS NULL;
END $$;
