# S45 — Polish Final Checklist

## E2E total count

| Spec | Tests |
|---|---|
| saas-auth.spec.ts | 7 |
| saas-billing.spec.ts | 4 |
| saas-campanias.spec.ts | 5 |
| saas-crm.spec.ts | 8 |
| saas-funnels-depth.spec.ts | 3 |
| saas-inbox-depth.spec.ts | 1 |
| saas-modules.spec.ts | 17 + 6 (S45) = 23 |
| saas-pipeline.spec.ts | 4 |
| saas-public-api.spec.ts | 7 |
| saas-web-builder-depth.spec.ts | 3 |
| saas-whatsapp-depth.spec.ts | 3 |
| saas-workflows.spec.ts | 6 |
| saas-integrations.spec.ts (S45) | 11 |
| saas-memberships.spec.ts (S45) | 11 |
| saas-cpq-contracts.spec.ts (S45) | 16 |
| saas-pwa.spec.ts (S45) | 9 |
| saas-publicidad-attribution.spec.ts (S45) | 12 |
| **Total** | **~124** |

## Load smoke results

Run: `node scripts/load-smoke.mjs --baseUrl=http://localhost:3000`

Target:
- Concurrency: 50 requests/endpoint
- p95 < 2000ms
- 0% 5xx

Endpoints covered:
- `GET /api/health` — 200
- `GET /api/saas/crm/contacts` — 401 (no auth)
- `GET /api/saas/settings` — 401
- `GET /api/saas/contracts` — 401
- `GET /api/saas/integrations` — 401
- `GET /api/saas/memberships` — 401
- `GET /api/saas/facturas/dunning` — 401

## Pen test items closed

| Item | Status | Fix |
|---|---|---|
| `/api/public/contracts/sign/[token]` POST sin rate limit | ✅ Cerrado | `checkPublicApiRateLimit("sign:token", 10)` — 429 tras 10 req/min |
| Headers `X-Content-Type-Options` nosniff | ✅ Ya existía | `next.config.ts` línea 26 |
| Headers `X-Frame-Options` SAMEORIGIN | ✅ Ya existía | `next.config.ts` línea 25 |
| Headers `Referrer-Policy` strict-origin | ✅ Ya existía | `next.config.ts` línea 28 |
| Headers `Content-Security-Policy` | ✅ Ya existía | `next.config.ts` línea 38 |
| Rutas S42–S44 sin `requireSaasContext` | ✅ Verificado | Todas usan `requireSaasContext(req, "contacts.read")` |
| RBAC viewer no puede contacts.write | ✅ Verificado | saasRbac.ts + saasS35Security 68 tests |
| Rate limit public API (B2B API keys) | ✅ Ya existía | `requirePublicApiContext.ts` 60 req/min |

## Security vitest suite

- Archivo: `backend/saas/__tests__/saasS35Security.test.ts`
- Tests: **68** (57 originales S35 + 11 nuevos S45)
- Cobertura: RBAC matrix owner/admin/member/viewer, public API scopes, rate limiter sign endpoint

## CI gates añadidos

- **security-gate** job en `playwright-saas.yml`:
  - `tsc --noEmit` (0 errores TS)
  - `check-saas-stubs.mjs` (anti-stub)
  - anti-MOCK grep
  - vitest saasS35Security (RBAC + rate-limit)
- Trigger paths ampliados: `api/public/**`, `contracts/**`
