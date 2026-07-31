# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 4 Comunicación migrado + 3 fixes de causa raíz (open rate, SMS log, deliverability)** · `docs/ops/W3CRM_MIGRATION_PLAN.md` §15 (ADR-075) · prod tip **`3f10c272`** (sin deploy de este módulo aún) · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · `vitest backend/saas backend/email src/features/saas-crm` **195 archivos / 2467 passed / 4 skipped** · smoke sin sesión (307/401, sin 500) **PASS** · Playwright **no** re-ejecutado en esta sesión |
| **W3CRM** | Fase 1 auditoría **DONE** · módulo 1 **Dashboard DONE** · módulo 2 **CRM/Pipeline DONE** (+ fix badge `"default"`→`"neutral"` en Contratos, commit `8974e873`) · módulo 3 **IA NELVYON DONE** (chat persistence fix, knowledge-base en nav) · módulo 4 **Comunicación DONE**: `/saas/{inbox,whatsapp,dialer}` auditados y ya conformes (solo `inbox` recibe ajuste de coherencia a `KpiTile`); `/saas/{campanias,secuencias,deliverability}` migrados a `NelvyonDs*`+`KpiTile`; **3 bugs de causa raíz corregidos**: open rate de campañas hardcodeado a 0% (numerador `0` literal en el frontend pese a dato real del backend), `/saas/sms` con "campañas" descartando la respuesta real de la API (`campaigns: []` hardcodeado) + acción `create_campaign` no implementada en backend + campo `body`/`message` incorrecto en envío único, `deliverability` sin manejo de error/éxito. Nuevo `SaasSmsService.listRecent()` expone `saas_sms_log` (migración 419, ya poblada por `send()`, nunca leída hasta ahora). Ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §15 |
| **DashForge** | Plan ADR-074 en **pausa** (no cancelado) — W3CRM pasa a ser la plantilla de referencia principal por instrucción del usuario |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con el **módulo 5 (Automatizaciones y workflows)**, siguiendo el orden confirmado por el usuario en `docs/ops/W3CRM_MIGRATION_PLAN.md` §7 y §15 — no esperar nueva confirmación salvo decisión irreversible/coste/credenciales.
2. Validar visualmente en staging (con `DATABASE_URL` real y sesión autenticada) los módulos IA NELVYON y Comunicación — mismo bloqueo `BLOCKED_ENVIRONMENT` que CRM/Pipeline en local; smoke sin sesión ya confirmó 307/401 sin 500 en todas las rutas de ambos módulos.
3. Repetir el patrón validado por módulo: auditar antes de tocar código (no tocar lo que ya cumple el estándar visual — ver `inbox`/`whatsapp`/`dialer` en §15.1), reutilizar componentes/APIs reales ya existentes, cero mock data, corregir causas raíz de bugs funcionales encontrados en la auditoría (no solo estética), tsc/lint/build/vitest PASS antes de cerrar, commit separado, documentar.
4. `@fullcalendar/react@7.0.2` (React 19 ✅) sigue reservado para `citas`/`calendar` cuando se aborde ese módulo — no instalar antes de tiempo.
5. No prod deploy UI · no flip claimReady · canary KILL.

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
