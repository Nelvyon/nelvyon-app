# PHASE2 — Router → SaaS PrivateAI (cerrado)

> 2026-07-16 · Post certificación Router + bloque maestro Labs

## Veredicto

**Bloque 1 CERRADO** — Model Router certificado integrado en SaaS Private AI vía HTTP + provider chain.

## Arquitectura

```
POST /api/saas/private-ai/agents     → PrivateAiOrchestrator → PrivateAiRouter
                                              ↓
                                    local_router (preferido)
                                              ↓
                                    LocalModelRouter.executeTask()
                                              ↓
                                    RAG + memoria + especialización + gate

POST /api/saas/private-ai/inference  → SaasPrivateAiService
         mode=route                  → routeTask()
         mode=execute                → executeTask() + audit + approvals

GET  /api/saas/private-ai/router-health → getRouterHealth()
GET  /api/saas/private-ai/status        → platform + router health
```

## Componentes

| Archivo | Rol |
|---|---|
| `backend/private-ai/providers/LocalModelRouterProvider.ts` | Bridge ILlmProvider → executeTask |
| `backend/private-ai/core/PrivateAiRouter.ts` | Chain: local_router → local_ollama |
| `backend/saas/SaasPrivateAiService.ts` | routeInference / executeInference / getRouterHealthStatus |
| `apps/web/src/app/api/saas/private-ai/inference/route.ts` | HTTP inference |
| `apps/web/src/app/api/saas/private-ai/router-health/route.ts` | HTTP health |

## Feature flags

| Variable | Default | Efecto |
|---|---|---|
| `NELVYON_AI_ENABLED` | 0 | Master switch IA |
| `OLLAMA_CONFIGURED` | 0 | Runtime local |
| `NELVYON_LOCAL_ROUTER_ENABLED` | 1 | Usa Router certificado (si Ollama configurado) |

Rollback: `NELVYON_LOCAL_ROUTER_ENABLED=0` → cae a `local_ollama` directo.

## Auth / permisos

- Inference POST: `requireSaasContext(req, "workflows.execute")`
- Health/status GET: `contacts.read`
- `tenantId` siempre desde JWT — nunca del body

## Tests

```bash
pnpm -C apps/web exec vitest run backend/saas/__tests__/saasPrivateAiRouterWiring.test.ts --reporter=dot
```

## Siguiente bloque

**MCP Productivo** — ver HANDOVER.md
