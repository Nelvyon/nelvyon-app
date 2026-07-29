# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-29** — **CIERRE ABSOLUTO REPO** (seguridad OS admin + SMS bulk OFF + rate limits + CI + Playwright full aligned) · canary **KILL ON** · `claimReady: false` · **NOT READY** (humano)

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `4065635c` (cierre absoluto seguridad+CI+docs) |
| **Staging deploy** | `6c60272e` SUCCESS · live `git_sha=4065635cd754` |
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
| Rate limits | forgot/reset-password · portal login · `/api/saas/sms` · middleware `/api/platform/*` |
| FastAPI RL | Redis errors **fail-closed** |
| CI | Staging smokes → Railway staging URL · `os-gate` pnpm order · stripe-meter cron schedule · dead envato scripts removed |

## Cert (ejecutar post-cambio)

| Gate | Esperado |
|------|----------|
| tsc / lint / build | **PASS** |
| Vitest monorepo | **0 FAIL** |
| Playwright completo | **386 PASS / 1 skip** |
| Staging smokes | pendiente solo tras push/redeploy |

## Próximo paso EXACTO

1. Push del tip final del cierre absoluto y dejar que staging redeploye con este mismo estado certificado.
2. Ejecutar smokes P0 de staging tras ese redeploy para revalidar el artefacto exacto que se publique.
3. CEO: SÍ/NO `docs/ops/PROD_MIGRATE_521_522_RUNBOOK.md` (migrate→deploy). Sin SÍ: no migrate · no deploy · no canary · no mass-send · no OAuth.

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_SMS_BULK_ENABLED=0
```
