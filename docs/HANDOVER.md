# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-28** — Push + staging deploy + SES align · tip remoto **`40099898`** · canary **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Último tip remoto** | `40099898` (`origin/main`) |
| **Staging deploy** | `56df6a6e` **SUCCESS** · Online · `https://ideal-victory-staging.up.railway.app` |
| **Auditoría SSOT** | `docs/ops/CTO_DEFINITIVE_PENDING_AUDIT_2026-07-28.md` **v3.2** |
| **Rama** | `main` · tip remoto `40099898` · docs/evidence v3.2 locales (commit ops si CEO pide push) |
| **SAFE_TO_PUSH** | n/a (tip ya en remoto) |
| **SAFE_TO_DEPLOY_STAGING** | **done** (redeploy from-source tras incident `railway down`) |
| **SAFE_TO_MIGRATE_PROD** | **false** |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## Próximo paso EXACTO

1. CEO: SÍ/NO **prod** migrate 521+522 (ADR-064) — **no** hasta SÍ explícito.
2. CEO: SÍ/NO commit+push de docs/evidence post-deploy v3.2 (si se pide).
3. **No** abrir canary · **no** mass-send · **no** declarar READY.

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
