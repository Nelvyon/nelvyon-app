# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-28** — Certificación pre-push · tip **`5579625f`** · canary **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Último tip** | `5579625f` (cert fix DECISIONS+typecheck) |
| **Auditoría SSOT** | `docs/ops/CTO_DEFINITIVE_PENDING_AUDIT_2026-07-28.md` **v3.1** |
| **Rama** | `main` (**ahead 8** · **no push**) |
| **SAFE_TO_PUSH** | **true** (lint preexistente documentado) |
| **SAFE_TO_DEPLOY_STAGING** | **true** tras push (mig 521/522 ya en staging DB) |
| **SAFE_TO_MIGRATE_PROD** | **false** |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## Próximo paso EXACTO

1. CEO: SÍ/NO **push** tip `5579625f` (8 commits).
2. Tras push: redeploy/verify staging `ideal-victory` · health + workflows reval.
3. CEO: SÍ/NO alinear staging `SES_REGION=eu-west-1` (identities solo allí).
4. CEO: SÍ/NO **prod** migrate 521+522 (ADR-064) — **no** hasta SÍ explícito.
5. **No declarar READY.**

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
