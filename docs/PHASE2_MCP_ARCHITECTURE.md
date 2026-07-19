# PHASE2 — MCP Architecture

## Capas

```
SaaS HTTP / Router bridge
        ↓
McpProductiveClient
        ↓
McpProductiveServer
  → RateLimiter → CircuitBreaker → Idempotency
  → PolicyEngine (auth → tenant → authz → input → risk)
  → ToolRegistry + handlers
  → Output validation
  → McpAuditService + McpApprovalBridge
```

## Módulos (`backend/mcp/`)

| Path | Rol |
|---|---|
| `types.ts` | Contratos tipados + versionado protocolo |
| `config.ts` | Feature flags / timeouts / rate limits |
| `registry/ToolRegistry.ts` | Descubrimiento y registro |
| `policy/PolicyEngine.ts` | Decisiones allowed/denied/approval_required |
| `server/McpProductiveServer.ts` | Orquestación invoke |
| `client/McpProductiveClient.ts` | Cliente tipado |
| `router/McpRouterBridge.ts` | Selección de herramientas desde query Router |
| `resilience/*` | Circuit, rate limit, idempotencia |
| `tools/productiveTools.ts` | Herramientas seguras iniciales |
| `audit/` · `approvals/` | Persistencia / memoria offline |

## Versionado

- Protocolo: `2024-11-05`
- Server: `2.0.0`
- Cada tool: `version` semver en definición

## Health

`server.health()` → `{ ok, enabled, version, toolCount, ... }`

## Legacy

`NelvyonMcpService` + `backend/mcp/server.ts` (stdio) siguen disponibles; el path productivo es `SaasMcpProductiveService` + `/api/saas/mcp`.
