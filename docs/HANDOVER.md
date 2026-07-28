# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-28** — Cleanup seguro v3.3 · tip remoto **`9a36ab61`** · canary **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Último tip remoto** | `9a36ab61` |
| **Staging** | Online `56df6a6e` · health OK |
| **Auditoría SSOT** | `docs/ops/CTO_DEFINITIVE_PENDING_AUDIT_2026-07-28.md` |
| **SAFE_TO_MIGRATE_PROD** | **false** |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |
| **Cert post-cleanup** | tsc **0** · lint **0** · build **0** · vitest **2471** · PW secuencias **5** |

## Próximo paso EXACTO

1. CEO: SÍ/NO **prod** migrate 521+522 (ADR-064).
2. **No** canary · **no** mass-send · **no** READY.

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
