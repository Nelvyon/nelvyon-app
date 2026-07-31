# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 3 IA NELVYON migrado + fix de historial de chat (causa raíz)** · `docs/ops/W3CRM_MIGRATION_PLAN.md` §14 (ADR-075) · prod tip **`3f10c272`** (sin deploy de este módulo aún) · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · `vitest backend/saas + src/features/saas-shell` **2446 passed / 4 skipped** · Playwright **no** re-ejecutado en esta sesión |
| **W3CRM** | Fase 1 auditoría **DONE** · módulo 1 **Dashboard DONE** · módulo 2 **CRM/Pipeline DONE** (+ fix badge `"default"`→`"neutral"` en Contratos, commit `8974e873`) · módulo 3 **IA NELVYON DONE**: `/saas/{ai,autopilot}` migrados a `NelvyonDs*`+`KpiTile`; `/saas/agentes` muestra historial real de ejecuciones; `/saas/chat` corregido — el `POST` nunca persistía en `saas_chat_messages` pese a que el `GET` sí leía de ahí (gap real de historial **y** de GDPR export/delete) → `SaasChatService.saveExchange` + `DELETE /api/saas/chat`; ruta huérfana `/saas/knowledge-base` (real, con API+RBAC, pero ausente del sidebar) añadida a `saasNav.ts` (grupo `gestion`) + 6 locales. Ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §14 |
| **DashForge** | Plan ADR-074 en **pausa** (no cancelado) — W3CRM pasa a ser la plantilla de referencia principal por instrucción del usuario |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con el **módulo 4 (Comunicación: inbox/campañas/secuencias)**, siguiendo el orden confirmado por el usuario en `docs/ops/W3CRM_MIGRATION_PLAN.md` §7 y §14 — no esperar nueva confirmación salvo decisión irreversible/coste/credenciales.
2. Validar visualmente en staging (con `DATABASE_URL` real y sesión autenticada) el módulo IA NELVYON — mismo bloqueo `BLOCKED_ENVIRONMENT` que CRM/Pipeline en local; smoke sin sesión ya confirmó 307/401 sin 500 en `/saas/{ai,autopilot,agentes,chat,copywriter,knowledge-base}`.
3. Repetir el patrón validado por módulo: auditar antes de tocar código, reutilizar componentes/APIs reales ya existentes, cero mock data, no crear pantallas sin API real detrás (ver decisión explícita en §14.1 sobre "Prompts"/"config. de modelos"), tsc/lint/build/vitest PASS antes de cerrar, commit separado, documentar.
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
