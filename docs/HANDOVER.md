# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-29** — WIP excellence **pushed** tip `b236bba0` · staging deploy `073949a1` SUCCESS · canary **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `b236bba0` |
| **Staging deploy** | `073949a1` SUCCESS · live `git_sha=b236bba0e12d` |
| **Ops SSOT** | `docs/ops/OPERATIONS_INDEX.md` |
| **SAFE_TO_MIGRATE_PROD** | **true** (técnico; solo SÍ CEO) |
| **SAFE_TO_DEPLOY_PROD** | **false** hasta migrate 521–522 |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## Cert local (pre-push)

| Gate | Resultado |
|------|-----------|
| tsc / lint | **0** / **0** |
| Vitest WIP focused | **49 PASS** |
| Vitest canónico SaaS | **2482 PASS** |
| Vitest monorepo completo | 6198 PASS · 16 FAIL **preexistentes** (no WIP) |
| build | **PASS** |
| Playwright secuencias | **5 PASS** |

## Staging post-deploy

| Smoke | Resultado |
|-------|-----------|
| health live/ready | **200** · sha `b236bba0` · env.ok |
| workflows | **CERTIFIED 14/14** |
| sequences | **8/8 PASS** |
| honesty | **12/12 PASS** |
| CRM export | **PASS** |
| CRM import batch | **CERTIFIED** imported=2 |
| artifact traversal | **400** (rejected) |
| webhook idempotency | **duplicate:true** on replay |
| rate limit export | **429** enforced |
| unauth export/webhook | **401** |

Evidencia: `scripts/docs/evidence/os-saas-e2e/modules/saas.excellence_wip_*_latest.json`

## Próximo paso EXACTO

1. CEO: SÍ/NO ejecutar `docs/ops/PROD_MIGRATE_521_522_RUNBOOK.md` (migrate→deploy).
2. Sin SÍ: no migrate · no deploy · no canary · no mass-send.

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
