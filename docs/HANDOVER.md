# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — **ADR-064 VERIFIED live** · tip **`c2edb2da`** staging+prod · ERP reval ALL_PASS · 519/520 kept · `claimReady: false` · **NOT READY**

> Última actualización automática: **2026-07-25 15:50 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | `c2edb2da` |
| **Fecha doc** | 2026-07-25 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** |
| **Staging** | tip **`c2edb2da`** · deploy **`da6b7a74` SUCCESS** · migrate gate auto-apply · ERP A/B+concurrency **ALL_PASS** · health ready |
| **Prod** | tip **`c2edb2da`** · deploy **`a82b55ac` SUCCESS** · gate **skip-apply** (`pending_count=0`, isProduction=true) · 519/520 **kept** · IA keys ABSENT |
| **P0 gobernanza** | **IMPLEMENTED_VERIFIED** — ADR-064 fail-closed prod migrate |
| **Legal** | `claimReady` **false** · Pepito **forbidden** |
| **Coste** | 0 |

### Capacidades

| Capacidad | Estado |
|-----------|--------|
| ERP staging (persist/A/B/concurrency) | **IMPLEMENTED_VERIFIED** |
| ERP schema prod 519/520 | **IMPLEMENTED_VERIFIED** (schema; no revert) |
| Prod migrate gate ADR-064 | **IMPLEMENTED_VERIFIED** (código + staging apply + prod no-op logs) |
| Dual-write relacional | **PREPARED_OFF** (ADR-062) |
| Multirréplica 2+ | **PREPARED_OFF** |
| OS/agency cores / influencers | **IMPLEMENTED_VERIFIED** (core/staging) |
| OAuth/Twilio/ads/publish reales | **BLOCKED_EXTERNAL** |
| IA canary prod / OpenAI | **BLOCKED_CEO** / OFF |
| Mass-send / Pepito | **BLOCKED_LEGAL** |
| Pagos/GL/Odoo | **BLOCKED_SCOPE** |

## Próximo paso EXACTO

1. **Daniel:** firmar ack histórico 519/520 + política auto-deploy en `ERP_PROD_MIGRATE_519_520_RUNBOOK.md` / `PROD_MIGRATE_GATE_RUNBOOK.md`.
2. **Daniel:** no dejar `NELVYON_PROD_MIGRATE_*` permanentes en prod; solo ventana migratoria deliberada.
3. **CEO:** canary IA / iOS / Pepito / OAuth reales según checklists — **sin declarar READY**.

## Acciones solo Daniel

| # | Acción | Doc |
|---|--------|-----|
| 1 | Ack 519/520 histórico + política auto-deploy | `ERP_PROD_MIGRATE_519_520_RUNBOOK.md` · `PROD_MIGRATE_GATE_RUNBOOK.md` |
| 2 | Ventana migrate futura: set/unset vars aprobación | `PROD_MIGRATE_GATE_RUNBOOK.md` |
| 3 | Canary IA prod | `CEO_IA_PROD_CANARY_REQUEST.md` |
| 4 | PWA iOS / Pepito / OAuth reales | checklists ops |

### Rollback staging

```
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_ADS_SPEND_ENABLED=0
```
