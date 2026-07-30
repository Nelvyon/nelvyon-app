# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-30** — **CTO quality P1 fixes** · informe `docs/ops/CTO_QUALITY_AUDIT_2026-07-30.md` · DashForge Fase 1 plan · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/vitest core **PASS** · P1 UI/encoding/branding/tenant-id **FIXED** · Playwright/build **no** re-ejecutados aquí |
| **DashForge** | Solo plan ADR-074 · sin UI kit en producto aún |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Commit(s) de calidad CTO si aún no pusheados · opcional `pnpm -C apps/web build` + Playwright SaaS en staging.
2. OK humano a DashForge plan → Fase 2 kit `nelvyon-ui`.
3. No prod deploy UI · no flip claimReady · canary KILL.

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
