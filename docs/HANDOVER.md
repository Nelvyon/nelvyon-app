# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-30** — cierre absoluto fase final Cursor · tip docs (post-commit) · staging live `3c64111bd198` · canary **KILL ON** · `claimReady: false` · **NOT READY** (humano)

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `3c64111b` (+ working tree cierre: cert helpers + OAuth URIs + passwordless gates — tip nuevo tras commit) |
| **Staging deploy** | live `git_sha=3c64111bd198` (código CSRF/orchestrator desde `9bbd5808`) |
| **Ops SSOT** | `docs/ops/OPERATIONS_INDEX.md` |
| **SAFE_TO_MIGRATE_PROD** | **true** (técnico; solo SÍ CEO) |
| **SAFE_TO_DEPLOY_PROD** | **false** hasta migrate 521–522 |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## Cierre absoluto in-repo (2026-07-29 → 2026-07-30)

| Cambio | Detalle |
|--------|---------|
| OS isolation | dashboards OS → **`requirePlatformAdmin`** |
| SMS mass-send | Bulk API **403** · fail-closed · cap 5 |
| Rate limits | auth/portal/sms/LMS · middleware platform+lms · FastAPI fail-closed |
| LMS public | learner HMAC access token |
| CI / E2E | Staging Railway URLs · Playwright **386 PASS / 1 skip / 1 flaky** · Vitest **6228 PASS / 0 FAIL** |
| Orchestrator BFF | `/api/saas/orchestrator` (flag OFF) |
| CSRF staging | same-origin + Railway host · KI-020 **PASS** |
| Cert helpers | `CERT_BASE_URL` default → `ideal-victory-staging.up.railway.app` · register RL backoff |
| Passwordless gates | `scripts/run-staging-passwordless-gates.mjs` (health + KI-020) |
| OAuth prep | redirect URIs **exactas** en `OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md` |

## Cert (2026-07-30 local)

| Gate | Resultado |
|------|----------|
| tsc | **PASS** (0) |
| lint | **PASS** (0) |
| build | **PASS** (clean `.next`, sin race) |
| Vitest | **6228 PASS / 8 skip / 0 FAIL** |
| Playwright | **386 PASS / 1 skip / 1 flaky** (Chromium instalado en `%LOCALAPPDATA%\ms-playwright`) |
| Staging health/live | **ok** · sha `3c64111bd198` |
| KI-020 CSRF | **PASS** |
| Honesty / workflows register | **BLOCKED** auth-signup **429** sin `STAGING_QA_PASSWORD` |

## Próximo paso EXACTO

1. Ops: `STAGING_QA_PASSWORD` → `node scripts/run-staging-p0-smokes.mjs --skip-wait` (honesty/workflows/portal-packs; IP rate-limited en register).
2. CEO: SÍ/NO `docs/ops/PROD_MIGRATE_521_522_RUNBOOK.md` (migrate→deploy tip HANDOVER).
3. Sin SÍ: no migrate · no deploy prod · no canary · no mass-send · no OAuth live.

Lista humana mínima: `docs/ops/CEO_MASTER_ACTIONS_CURSOR_CLOSED.md`.

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
