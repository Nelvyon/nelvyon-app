# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 11 Administración migrado** (team suspend/reactivate + MFA URI + tokens) · `docs/ops/W3CRM_MIGRATION_PLAN.md` §22 · prod tip **`3f10c272`** (sin deploy de este módulo aún) · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · `vitest backend/saas backend/email src/features/saas-crm` **195 archivos / 2471 passed / 4 skipped** · smoke sin sesión (307/401, sin 500) **PASS** · Playwright **no** re-ejecutado en esta sesión |
| **W3CRM** | Fase 1 auditoría **DONE** · módulos 1–10 **DONE** · módulo 11 **Administración DONE**: suspend/reactivate de equipo usaba POST (solo invite) sin `reactivate` en API → corregido con `SaasTeamService.reactivate` + PATCH; mapper API↔UI (`lastActiveAt`/`avatar`); modal editar rol; MFA `provisioningUri` mostrado; filtros auditoría reset página; tokens en team/security/subcuentas. Ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §22 |
| **DashForge** | Plan ADR-074 en **pausa** (no cancelado) — W3CRM pasa a ser la plantilla de referencia principal por instrucción del usuario |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con el **módulo 12 (Ecommerce / Tienda Online — `/saas/store`)**, siguiendo el orden confirmado por el usuario en `docs/ops/W3CRM_MIGRATION_PLAN.md` §7 y §22 — no esperar nueva confirmación salvo decisión irreversible/coste/credenciales.
2. Validar visualmente en staging (con `DATABASE_URL` real y sesión autenticada) los módulos 2–11 — mismo bloqueo `BLOCKED_ENVIRONMENT` en local; smoke sin sesión ya confirmó 307/401 sin 500.
3. Repetir el patrón validado por módulo: auditar antes de tocar código, reutilizar APIs reales, cero mock data, corregir causas raíz, tsc/lint/build/vitest PASS, commits separados, documentar.
4. No prod deploy UI · no flip claimReady · canary KILL.

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
