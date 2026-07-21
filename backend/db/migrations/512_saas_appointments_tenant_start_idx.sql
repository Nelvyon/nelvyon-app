-- Additive index for /api/saas/citas ORDER BY start_at (tenant-scoped).
-- Safe to apply post-MCP soak; does not alter data or existing indexes.
CREATE INDEX IF NOT EXISTS idx_saas_appointments_tenant_start
  ON saas_appointments (tenant_id, start_at);
