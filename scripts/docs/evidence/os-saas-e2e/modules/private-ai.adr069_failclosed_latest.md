# Evidence — ADR-069 local-AI prod fail-closed (no canary reactivation)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-27 |
| Causa raíz | `getLocalAiConfig()` caía a `127.0.0.1:5434` cuando faltaban `LOCAL_AI_DATABASE_URL` / `NELVYON_LOCAL_AI_USE_MAIN_DB` |
| Corrección | `resolveLocalAiDatabaseUrl` + `assertLocalAiDatabaseUrlReady` + schema assert · prod nunca loopback · inference fail-closed |
| DDL prod | **no** aplicado |
| Canary / AI / OpenAI / MCP / SM / OpenClaw | **no** activados |
| claimReady | **false** · **NOT READY** |

## Precedencia DB (código)

1. `LOCAL_AI_DATABASE_URL`
2. `DATABASE_URL` solo si `NELVYON_LOCAL_AI_USE_MAIN_DB=1`
3. non-prod: owner default `127.0.0.1:5434`
4. production: **forbidden** — `PRIVATE_AI_RAG_BLOCKED`

## Gates verificación

| Gate | Resultado |
|------|-----------|
| vitest ADR-069 + railwayRagPrep + PrivateAiCanaryPrep | **48 PASS** (subset) |
| vitest backend/saas + local-ai/__tests__ + canary | **2445 PASS** / 4 skip |
| tsc apps/web | **0** |
| saasDealsTenantIsolation | **7 PASS** |
| prod health live/ready | **200** tip `1eaed9f2` (pre-deploy fix) |
| prod flags | KILL=1 · canary=0 · AI=0 · OLLAMA_CONFIGURED=0 · OpenAI ABSENT · USE_MAIN_DB ABSENT · SCHEMA_APPLY ABSENT |
| mesh (redacted) | MESH_OPTION_A=1 · hostname set · OLLAMA_HOST Tailscale CGNAT · TS_AUTHKEY SET (value not logged) |

## Rollback código

Revert commit ADR-069 fail-closed; flags prod ya fail-closed (sin cambio de env requerido).

## Pendientes

1. CEO elige A o B en `CEO_PROD_RAG_DB_OPTIONS.md`
2. Si A: revalidar staging → ADR-064 prod schema → solo entonces canary
3. Legal / mercado / OAuth
