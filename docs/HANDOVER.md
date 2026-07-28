# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-29** — WIP excellence cerrado → push staging · canary **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Tip base** | (post-push tip) |
| **Ops SSOT** | `docs/ops/OPERATIONS_INDEX.md` |
| **SAFE_TO_MIGRATE_PROD** | **true** (técnico; solo SÍ CEO) |
| **SAFE_TO_DEPLOY_PROD** | **false** hasta migrate 521–522 |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## Cert pre-push (local)

| Gate | Resultado |
|------|-----------|
| tsc | **0** |
| lint | **0** |
| Vitest WIP (CRM/security/artifact/queue/rateLimit) | **49 PASS** |
| Vitest canónico SaaS/email/billing/crm/security | **2482 PASS** / 4 skip |
| Vitest monorepo completo | 6198 PASS · **16 FAIL preexistentes** (packs/autonomous/qa flows — no WIP) |
| build | **PASS** |
| Playwright `saas-secuencias` | **5 PASS** |

## Próximo paso EXACTO

1. Validar staging post-deploy (health · workflows · sequences · CRM · artifacts).
2. CEO: SÍ/NO migrate 521→522→deploy prod.
3. Sin SÍ: no migrate · no deploy · no canary · no mass-send.

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
