# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **Certificación final SaaS §34** · `docs/ops/W3CRM_MIGRATION_PLAN.md` · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false` · veredicto **CONDITIONAL_READY**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/eslint/vitest(**6253**)/build **PASS** · HTTP smoke 307/401 · PW SaaS **270/349** (mocked) · LH login a11y **88** |
| **W3CRM** | Módulos 1–18b **DONE** · auditoría global + **cert final §34** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |
| **Staging live** | **BLOCKED_ENVIRONMENT** (sin `DATABASE_URL` / `STAGING_BASE_URL` local) |

## Próximo paso EXACTO

1. **No** flip `claimReady` · **no** prod deploy · canary KILL.
2. Tras rebuild post-fix dashboard loading: re-ejecutar `a11y-core-routes` + smoke HTTP.
3. Staging real (DB + URL) cuando haya acceso seguro: usuarios nuevos/existentes, 2 roles, 2 tenants, GDPR export/delete, billing/webhooks.
4. Solo humano: OAuth/SES/Twilio · Pepito/legal · autorización producción.

### Rollback IA / spend

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_ADS_SPEND_ENABLED=0
NELVYON_SMS_BULK_ENABLED=0
NELVYON_ORCHESTRATOR_ENABLED=0
```
