# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-29** — Cursor backlog técnico **AGOTADO** · tip **`01fcb70a`** · canary **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Último tip remoto** | `01fcb70a` |
| **Runbook prod** | `docs/ops/PROD_MIGRATE_521_522_RUNBOOK.md` |
| **Staging 521/522** | **CONFIRMADAS** |
| **Prod 521/522** | **NO** · CEO + ADR-064 |
| **SAFE_TO_MIGRATE_PROD** | **true** (técnico; solo SÍ CEO) |
| **SAFE_TO_DEPLOY_PROD** | **false** hasta migrate |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |
| **Cursor backlog seguro** | **AGOTADO** |

## Próximo paso EXACTO

1. CEO: SÍ/NO ejecutar runbook migrate 521→522→deploy.
2. Sin SÍ: no migrate · no deploy · no canary · no mass-send.

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
