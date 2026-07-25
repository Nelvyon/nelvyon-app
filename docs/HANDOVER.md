# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — **CIERRE INTERNO ABSOLUTO** · ADR-064 harden `migrate.ts` · i18n saas nav/common · mobile SSOT · tip `0a253c7f` · `claimReady: false` · **NOT READY**

> Última actualización automática: **2026-07-25 16:02 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | 0a253c7f |
| **Fecha doc** | 2026-07-25 |
| **Rama** | `main` |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** |
| **Staging live** | tip **`c2edb2da`** · ERP A/B+concurrency reval **ALL_PASS** · ready OK |
| **Prod live** | tip **`c2edb2da`** · gate skip-apply VERIFIED · 519/520 kept · IA ABSENT |
| **P0 gobernanza** | ADR-064 **IMPLEMENTED_VERIFIED** + harden `migrate.ts` (cierra bypass `pnpm migrate`) |
| **Legal** | `claimReady` **false** · Pepito **forbidden** |
| **Coste** | 0 |

### Capacidades (honestas)

| Capacidad | Estado |
|-----------|--------|
| ERP persist/A/B/concurrency | **IMPLEMENTED_VERIFIED** |
| Prod migrate gate (migrate:prod + migrate.ts) | **IMPLEMENTED_VERIFIED** |
| Dual-write relacional | **PREPARED_OFF** |
| Multirréplica 2+ | **PREPARED_OFF** |
| i18n UI key parity + saas nav/common/errors/settings | **IMPLEMENTED_VERIFIED** |
| i18n remaining saas.* pages / email / PDF | **PREPARED_OFF** (PARTIAL content) |
| Android local assembleDebug | **IMPLEMENTED_VERIFIED** |
| Android device smoke / iOS / Play | **BLOCKED_EXTERNAL** |
| OAuth/Twilio/ads/publish reales | **BLOCKED_EXTERNAL** |
| IA canary prod / OpenAI | **BLOCKED_CEO** / OFF |
| Mass-send / Pepito | **BLOCKED_LEGAL** |
| Pagos/GL/Odoo | **BLOCKED_SCOPE** |

## Próximo paso EXACTO

1. **Daniel:** ack 519/520 + política auto-deploy · no dejar `NELVYON_PROD_MIGRATE_*` permanentes.
2. **CEO:** canary IA (`CEO_IA_PROD_CANARY_REQUEST.md`) · iOS · Pepito/legal · OAuth reales.
3. **Device:** `adb` smoke Android (3 pasos en checklist móvil).

## Acciones solo Daniel

| # | Acción | Doc |
|---|--------|-----|
| 1 | Ack 519/520 + migrate policy | `PROD_MIGRATE_GATE_RUNBOOK.md` |
| 2 | Ventana migrate futura set/unset | idem |
| 3 | Canary IA prod SÍ/NO | `CEO_IA_PROD_CANARY_REQUEST.md` |
| 4 | Android device / iOS / OAuth / Pepito | checklists ops |

### Rollback staging

```
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_ADS_SPEND_ENABLED=0
```
