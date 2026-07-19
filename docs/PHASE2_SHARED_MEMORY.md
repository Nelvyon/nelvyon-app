# PHASE2 — Shared Memory (runtime — ADR-024)

> Flag default **OFF**: `NELVYON_SHARED_MEMORY_ENABLED=0`  
> Migración: `514_shared_memory.sql`

## Objetivo

Memoria multi-agente con aislamiento total por tenant: STM/LTM, scopes tenant/agent/user/session/workspace/shared_team.

## SSOT

| Capa | Path |
|------|------|
| Contratos | `backend/shared-memory/types.ts` v1.1.0 |
| Store | `PostgresSharedMemoryStore` \| `InMemorySharedMemoryStore` |
| Política | `DefaultSharedMemoryPolicy` |
| SaaS | `SaasSharedMemoryService` |
| API | `GET/POST/DELETE /api/saas/shared-memory` |
| MCP | `memory_read` / `memory_write` (flag-gated; OFF = shape certificado vacío) |

**No reemplaza** `SaasTenantMemoryService` (chunks inbox). Shared Memory = multi-agente SSOT.

## Capas de memoria

| Layer | Scopes típicos | TTL default |
|-------|----------------|-------------|
| `stm` | `session`, `user` | `NELVYON_SHARED_MEMORY_STM_TTL_HOURS` (24h) |
| `ltm` | `tenant`, `agent`, `workspace`, `shared_team` | `NELVYON_SHARED_MEMORY_TTL_DAYS` (90d) |

## Activación

```bash
# 1. Migrar
pnpm -C apps/web migrate

# 2. Flags
NELVYON_SHARED_MEMORY_ENABLED=1
# opcional tests/dev:
NELVYON_SHARED_MEMORY_BACKEND=memory
```

## Rollback

`NELVYON_SHARED_MEMORY_ENABLED=0` → store `SharedMemoryNotEnabledError` / MCP offline shape.

## Tests

```bash
pnpm -C apps/web exec vitest run backend/saas/__tests__/sharedMemoryContracts.test.ts --reporter=dot
```
