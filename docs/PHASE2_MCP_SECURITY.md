# PHASE2 — MCP Security

## Pipeline obligatorio

1. Autenticación (SaaS JWT / API key legacy)
2. Tenant isolation (`tenantId` obligatorio; override en args → deny)
3. Autorización (scopes `mcp.read` / `mcp.write` / `workflows.execute`)
4. Validación input (schema + sanitización)
5. Policy engine (risk + forbidden)
6. Ejecución (timeout / cancel / retry limitado)
7. Validación output (bloqueo secretos en respuesta)
8. Audit log (`toolCallId`, hash args, sin prompts sensibles)

## Bloqueos hard (critical = denied)

- Cross-tenant
- Secretos en args (`api_key`, `sk-…`, Bearer…)
- Prompt injection
- SQL write (`INSERT/UPDATE/DELETE/DROP…`)
- Filesystem fuera de roots (`NELVYON_MCP_FS_ROOTS`)
- `delete_data`, `send_mass_campaign`, `deploy_production`, pagos, Docker host, rotate credentials

## Aprobaciones

`decision: approval_required` → `McpApprovalBridge` → `saas_private_ai_approvals` (o memoria offline)

Payload: actionId, tenantId, userId, agentId, tool, args saneados, motivo, risk, expiración, requestId, traceId.

## PRIVATE_MODE

Sin telemetría externa. Scraping solo allowlist. GitHub/network stubs offline por defecto.

## Rollback

`NELVYON_MCP_PRODUCTIVE_ENABLED=0` → todas las invokes `feature_flag_off`.
