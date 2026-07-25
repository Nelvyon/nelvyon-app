# Prod migrate gate ADR-064 — live verification

> Date: 2026-07-25 · tip `c2edb2da` · `claimReady: false` · NOT READY

## Staging (`ideal-victory`)

| Campo | Valor |
|-------|-------|
| Deploy | `da6b7a74-2ae0-4678-b2a3-e1283601a382` SUCCESS |
| Live SHA | `c2edb2daa955` |
| Ready | `ready` · database ok · auth ok |
| Logs | `deploy_env=staging isProduction=false` · `pending_count=0` · `gate: non-production: migrate apply allowed` · apply path ran (all skip including 519/520) |

## Production (`@nelvyon/web`)

| Campo | Valor |
|-------|-------|
| Deploy | `a82b55ac-75b8-43ed-9ba4-fc4cff238c4d` SUCCESS |
| Live SHA | `c2edb2daa955` |
| Ready | `ready` · database ok · auth ok |
| Logs | `deploy_env=production(railway:production) isProduction=true` · `pending_count=0` · `gate: production: no pending migrations; skip apply (gate active, no CEO approval required for no-op)` |
| Approval vars | **not set** (correct for no-op) |
| 519/520 | **kept** (already applied historically; not reverted) |

## Unit regression

`backend/db/__tests__/prodMigrateGate.test.ts` — **13 PASS**

## ERP reval on tip (staging)

- `staging-smoke-erp-http-ab.mjs` → **ALL_PASS**
- `staging-smoke-erp-concurrency.mjs` → **ALL_PASS**

## Verdict

Prod migrate gate **IMPLEMENTED_VERIFIED** (code + staging apply path + prod skip-apply no-op). Future pending SQL without CEO approval will **fail deploy** (unit-tested; not exercised live with a fake pending migration).
