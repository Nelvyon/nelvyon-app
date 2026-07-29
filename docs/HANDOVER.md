# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-29** — tip **`9bbd5808`** live staging · CSRF KI020 **PASS** · orchestrator BFF 401 auth · canary **KILL ON** · `claimReady: false` · **NOT READY** (humano)

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `9bbd5808` (orchestrator BFF + CSRF staging + smoke URL defaults) |
| **Staging deploy** | `06520aab` SUCCESS · live `git_sha=9bbd5808376b` |
| **Ops SSOT** | `docs/ops/OPERATIONS_INDEX.md` |
| **SAFE_TO_MIGRATE_PROD** | **true** (técnico; solo SÍ CEO) |
| **SAFE_TO_DEPLOY_PROD** | **false** hasta migrate 521–522 |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## Cierre absoluto in-repo (2026-07-29)

| Cambio | Detalle |
|--------|---------|
| OS isolation | `qa-review` · `certificates` · `truth-guard` · `recurring` · `retainer` · `retainer/sync` → **`requirePlatformAdmin`** |
| SMS mass-send | Bulk API **403** · service fail-closed (`NELVYON_SMS_BULK_ENABLED!=1`) · cap 5 |
| Rate limits | forgot/reset-password · portal login · `/api/saas/sms` · LMS · middleware `/api/platform/*` + `/api/lms/*` |
| FastAPI RL | Redis errors **fail-closed** |
| LMS public | learner HMAC access token · progress/certificate gated |
| CI / E2E | Staging URLs Railway · Playwright **386 PASS / 1 skip** · Vitest **0 FAIL** |
| Orchestrator BFF | `/api/saas/orchestrator` wired for `/saas/ai` status (flag default OFF) |
| CSRF staging | Same-origin `requestOrigin` + Railway staging host allowlist · smoke defaults → Railway URL |

## Cert (local)

| Gate | Resultado |
|------|----------|
| tsc / lint / build | **PASS** |
| Vitest monorepo | **0 FAIL** |
| Playwright completo | **386 PASS / 1 skip** |
| Staging health/live | **ok** · sha `9bbd5808376b` |
| KI-020 CSRF staging | **PASS** (apex Railway + app.nelvyon.com) |

## Próximo paso EXACTO

1. Ops: ejecutar P0 smokes con secreto `STAGING_QA_PASSWORD` (`node scripts/run-staging-p0-smokes.mjs --skip-wait`).
2. CEO: SÍ/NO `docs/ops/PROD_MIGRATE_521_522_RUNBOOK.md` (migrate→deploy tip `9bbd5808`).
3. Sin SÍ: no migrate · no deploy prod · no canary · no mass-send · no OAuth.

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_SMS_BULK_ENABLED=0
NELVYON_ORCHESTRATOR_ENABLED=0
```
