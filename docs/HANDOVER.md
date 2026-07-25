# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — ERP staging closure · tip **`5a36809c`** · deploy **`5965c32b` SUCCESS** · HTTP A/B + concurrency **ALL_PASS** · ADR-062 PREPARED_OFF · prod migrate runbook **BLOCKED_CEO** · `claimReady: false` · **NOT READY**  

> Última actualización automática: **2026-07-25 15:10 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | `5a36809c` — `feat(erp): HTTP A/B + concurrency smokes, reserve API, ADR-062 runbook` |
| **Fecha doc** | 2026-07-25 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** · sin `claimReady` |
| **Staging live** | https://ideal-victory-staging.up.railway.app · tip **`5a36809c`** · deploy **`5965c32b` SUCCESS** · mig **519+520** · `AUTONOMOUS_ALLOW_OPENAI=0` |
| **ERP** | Postgres SSOT · restart **ALL_PASS** · HTTP A/B **ALL_PASS** · concurrency **ALL_PASS** · reserve API · dual-write relacional **PREPARED_OFF** (ADR-062) |
| **Prod** | **no** 519/520 claimed · runbook `ERP_PROD_MIGRATE_519_520_RUNBOOK.md` · **BLOCKED_CEO** · OpenAI=0 |
| **Legal** | `claimReady` **false** · Pepito **forbidden** |
| **Coste** | 0 |

### Tabla capacidades (honestidad)

| Capacidad | Estado | Matiz |
|-----------|--------|-------|
| ERP 26–29 + 35 | **IMPLEMENTED_VERIFIED** (staging) | Snapshot SSOT · A/B HTTP · concurrency · restart |
| Dual-write relacional 519 | **PREPARED_OFF** | ADR-062 plan only |
| Prod ERP migrate 519/520 | **BLOCKED_CEO** | Runbook listo · no ejecutar |
| Multirréplica 2+ app | **PREPARED_OFF** (0€) | FOR UPDATE designed; 2ª réplica no provisionada |
| influencers / ads / community / telephony / oauth / marketplace | **VERIFIED** (core/sim/mock) | Externos **BLOCKED_EXTERNAL** |
| private_vector_rag | Docker **VERIFIED** | Railway **PREPARED_OFF** |
| private_ai_canary | **PREPARED_OFF** | **BLOCKED_CEO** |
| i18n UI / email+PDF | **FULL** / **PARTIAL** | — |
| PWA / mobile / HA / multi-region | Chrome VERIFIED / Android build / single-region VERIFIED / multi-region **BLOCKED_EXTERNAL/COST** | — |
| Mass-send / claimReady | **BLOCKED_LEGAL** | Pepito forbidden |

**No READY.**

## Último trabajo

- HTTP Tenant A/B staging **ALL_PASS** (`erp.http_ab_isolation_latest.md`)
- Concurrency/idempotency **ALL_PASS** (`erp.concurrency_latest.md`) — same-key receive no double stock; over-reserve → `INSUFFICIENT_STOCK`; PR/MO parallel OK
- Inventory API `reserve` + regression contract test
- ADR-062 PREPARED_OFF · prod runbook (no execute)
- Prior: ADR-061 restart **ALL_PASS** tip `9e931f08`

## Próximo paso EXACTO

1. **CEO:** firmar SÍ/NO en `docs/ops/ERP_PROD_MIGRATE_519_520_RUNBOOK.md` antes de cualquier migrate prod (hoy: **no** ejecutar).
2. **Opcional:** escalar 2ª réplica staging **solo** con aprobación coste Railway → smoke concurrency multi-instance.
3. **Opcional:** dual-write ADR-062 cuando se decida (no hoy).
4. **CEO:** canary IA prod / PWA iOS / Pepito legal — ver tabla abajo.

## Acciones solo Daniel

| # | Acción | Doc |
|---|--------|-----|
| 1 | Firmar migrate ERP prod 519/520 SÍ/NO | `ERP_PROD_MIGRATE_519_520_RUNBOOK.md` |
| 2 | Canary IA prod | `CEO_IA_PROD_CANARY_REQUEST.md` |
| 3 | PWA iOS Safari | `PWA_IOS_SAFARI_CEO_CHECKLIST.md` |
| 4 | Licencia Pepito | `DATOS_PEPITO_LICENSE_DOSSIER.md` |
| 5 | 2ª réplica staging (coste) | Railway · solo si presupuesto |

### Rollback staging

```
NELVYON_INFLUENCERS_PR_PACK=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_ADS_SPEND_ENABLED=0
```
