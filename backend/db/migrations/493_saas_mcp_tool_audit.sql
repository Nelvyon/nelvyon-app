-- 493 — MCP tool invocation audit (usage logging for Nelvyon MCP server)
CREATE TABLE IF NOT EXISTS saas_mcp_tool_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  api_key_id   UUID,
  tool_name    TEXT NOT NULL,
  args_hash    TEXT NOT NULL,
  latency_ms   INTEGER NOT NULL DEFAULT 0,
  success      BOOLEAN NOT NULL DEFAULT TRUE,
  error_code   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_tool_audit_tenant_created
  ON saas_mcp_tool_audit(tenant_id, created_at DESC);
