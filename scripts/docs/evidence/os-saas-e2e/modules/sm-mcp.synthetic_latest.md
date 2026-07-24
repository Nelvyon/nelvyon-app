# Shared Memory + MCP — staging synthetic harness

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-24T16:08:37.546Z |
| Staging base | https://ideal-victory-staging.up.railway.app |
| Health check | PASS |
| Vitest harness | PASS |
| Shared Memory productiva | OFF (NELVYON_SHARED_MEMORY_ENABLED=0) |
| MCP productivo | OFF (NELVYON_MCP_PRODUCTIVE_ENABLED=0) |
| Pepito DB | nunca referenciada — solo tenants sintéticos A/B |
| Tenant isolation | verificado en unit tests (RLS-style, deny cross-tenant) |
| Deny-by-default | verificado en unit tests |

## Flags Railway (STAGING ONLY)

```
NELVYON_SHARED_MEMORY_STAGING=1  # synthetic-only SM drills — staging environment ONLY
NELVYON_MCP_STAGING_SYNTHETIC=1  # synthetic-only MCP drills — staging environment ONLY
# --- must stay unset/0 in every environment, including staging, until a separate ---
# --- CEO-authorized productive canary (see docs/ops/CEO_OPENCLAW_PROD_CANARY_REQUEST.md) ---
NELVYON_MCP_PRODUCTIVE_ENABLED=0
NELVYON_SHARED_MEMORY_ENABLED=0
```

## Rollback

- `NELVYON_SHARED_MEMORY_STAGING=0`
- `NELVYON_MCP_STAGING_SYNTHETIC=0`
- Confirmar que `NELVYON_MCP_PRODUCTIVE_ENABLED` y `NELVYON_SHARED_MEMORY_ENABLED` permanecen sin definir/0 en todos los entornos.
