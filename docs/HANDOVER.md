# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-29** — Prep final prod (runbook listo) · tip **`3a7318ac`** · canary **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Último tip remoto** | `3a7318ac` |
| **Runbook** | `docs/ops/PROD_MIGRATE_521_522_RUNBOOK.md` |
| **Staging 521/522** | **CONFIRMADAS** (cols + CHECK + `_migrations`) |
| **Prod 521/522** | **NO aplicadas** (probe READ-ONLY) |
| **Prod live SUCCESS** | deploy `77d9b5f8` (2026-07-27) · auto-deploys tip nuevo **FAILED/SKIPPED** |
| **SAFE_TO_MIGRATE_PROD** | **true** (técnico; solo con SÍ CEO + ADR-064) |
| **SAFE_TO_DEPLOY_PROD** | **false** hasta migrate 521+522 validadas |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## Próximo paso EXACTO

1. CEO: SÍ/NO ejecutar `docs/ops/PROD_MIGRATE_521_522_RUNBOOK.md` (521→validate→522→validate→deploy).
2. Sin SÍ: **no** migrate · **no** deploy · **no** canary · **no** mass-send.

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
