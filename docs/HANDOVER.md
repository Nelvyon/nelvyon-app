# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-30** — **DashForge Fase 1 AUDIT** · plan `docs/ops/DASHFORGE_MIGRATION_PLAN.md` · ADR-074 · APK emulator smoke · prod tip **`3f10c272`** · canary **KILL ON** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` (`git_sha=3f10c2729502`) |
| **UI SaaS** | Shell actual `SaasShellLayout` · rediseño DashForge **Fase 1 solo** (sin UI producto aún) |
| **DashForge** | Extract `.reference/dashforge-ai/` (gitignored) · kit whitelist documentado · **no** Clerk/Supabase/fake-data |
| **Android** | v1.0.0 APK · emulator smoke evidence · Play **BLOCKED_EXTERNAL** |
| **Ops SSOT integraciones** | `docs/ops/PHASE2_EXTERNAL_INTEGRATIONS.md` |
| **Mig prod** | **521+522 APPLIED** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. **CEO/Daniel OK** al plan `docs/ops/DASHFORGE_MIGRATION_PLAN.md` (hallazgo: DF = builder IA, no admin completo).
2. Fase 2: importar whitelist → `apps/web/src/features/nelvyon-ui/` + tokens NELVYON (commit separado).
3. No deploy prod UI hasta staging PASS + autorización expresa.
4. Fase 2 externa: OAuth/SES/Twilio según checklists (independiente).

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
