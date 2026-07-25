# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — **ADR-064 prod migrate gate** · tip código pending deploy · ERP staging VERIFIED · 519/520 prod **kept** (no revert) · `claimReady: false` · **NOT READY**

> Última actualización automática: **2026-07-25 15:29 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | pending this push (migrate gate) |
| **Fecha doc** | 2026-07-25 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** |
| **Staging** | tip live previo **`5a36809c`** · ERP A/B+concurrency+persist VERIFIED · health OK |
| **Prod** | tip **`5a36809c`** · 519/520 **applied** (histórico) · **nuevo gate** bloquea migraciones futuras sin CEO · IA keys ABSENT |
| **P0 gobernanza** | **FIXED (código)** — `migrate:prod` fail-closed en production (ADR-064) |
| **Legal** | `claimReady` **false** · Pepito **forbidden** |
| **Coste** | 0 |

### Capacidades

| Capacidad | Estado |
|-----------|--------|
| ERP staging (persist/A/B/concurrency) | **IMPLEMENTED_VERIFIED** |
| ERP schema prod 519/520 | **IMPLEMENTED_VERIFIED** (schema; no revert) |
| Prod migrate gate ADR-064 | **IMPLEMENTED_VERIFIED** (código + tests; verify on next staging/prod deploy) |
| Dual-write relacional | **PREPARED_OFF** (ADR-062) |
| Multirréplica 2+ | **PREPARED_OFF** |
| OS/agency cores / influencers | **IMPLEMENTED_VERIFIED** (core/staging) |
| OAuth/Twilio/ads/publish reales | **BLOCKED_EXTERNAL** |
| IA canary prod / OpenAI | **BLOCKED_CEO** / OFF |
| Mass-send / Pepito | **BLOCKED_LEGAL** |
| Pagos/GL/Odoo | **BLOCKED_SCOPE** |

## Próximo paso EXACTO

1. **Deploy staging** este tip → confirmar logs `migrate-prod` apply en staging (auto).
2. **Daniel:** no setear `NELVYON_PROD_MIGRATE_*` en prod salvo ventana migratoria deliberada; firmar ack histórico 519/520 en runbook.
3. **CEO:** canary IA / iOS / Pepito según checklists.

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
