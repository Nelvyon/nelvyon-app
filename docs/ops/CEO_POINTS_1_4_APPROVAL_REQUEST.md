# CEO — Aprobaciones puntos 1–4 (PREPARED_OFF · sin activar)

> **Estado: `PENDING_CEO`.** Este documento **no aprueba** ni **activa** nada.  
> Prep Cursor 2026-07-26 · tip repo **`738f8200`+** · live staging/prod **`d03721c1`** · `claimReady: false` · **NOT READY**  
> Evidencia fail-closed: `scripts/docs/evidence/os-saas-e2e/modules/points_1_4_failclosed_latest.json`  
> ERP staging reval: A/B + concurrency + persist **ALL_PASS** (mismo día).

## Reglas

- Responder **solo** SÍ o NO a cada frase (mensaje escrito).
- **SÍ ≠ ejecución automática.** Tras SÍ, Cursor/ops ejecuta el procedimiento del runbook citado en ventana corta y luego quita flags.
- Sin SÍ: todo permanece **PREPARED_OFF** / fail-closed.
- Queda OFF: OpenAI · MCP/SM/OpenClaw prod · partner payouts · campañas masivas · Pepito · coste nuevo (DB/réplica).

---

## 1 — Migraciones de producción (ADR-064)

**Frase para Daniel:**  
**¿Autorizas que cualquier migración SQL futura en producción `@nelvyon/web` solo se aplique tras ventana temporal `NELVYON_PROD_MIGRATE_APPROVED=1` + `NELVYON_PROD_MIGRATE_APPROVED_BY=Daniel` (y unset inmediato), confirmando que sin esa aprobación el deploy falla si hay pending? → SÍ / NO**

| Prep | Estado |
|------|--------|
| Gate `prodMigrateGate` + `migrate-prod.ts` + `migrate.ts` | VERIFIED (unit + live prior `prod.migrate_gate_latest.md`) |
| Auto-deploy `preDeployCommand=migrate:prod` | Gated · pending>0 sin approval → exit 1 |
| Ejecutar migraciones nuevas hoy | **NO** |

Runbook: `docs/ops/PROD_MIGRATE_GATE_RUNBOOK.md`

---

## 2 — Dual-write ERP (ADR-062)

**Frase para Daniel:**  
**¿Autorizas el cutover futuro dual-write/read-flip ERP relacional (`NELVYON_ERP_RELATIONAL_DUAL_WRITE=1` y luego `NELVYON_ERP_RELATIONAL_READ=1`) manteniendo hoy PREPARED_OFF con flags=0 y SSOT en `erp_domain_snapshots`? → SÍ / NO**

| Prep | Estado |
|------|--------|
| Flags fail-closed + misconfig READ sin DUAL_WRITE | VERIFIED |
| Staging A/B · concurrency · persist restart | **ALL_PASS** (2026-07-26) |
| Activar dual-write hoy | **NO** |

Runbook: `docs/ops/ERP_DUAL_WRITE_TRANSITION_RUNBOOK.md`

---

## 3 — RAG / pgvector Railway (ADR-065)

**Frase para Daniel:**  
**¿Autorizas aplicar el schema `local_ai_*` (pgvector RAG) en el Postgres Railway actual de staging con `NELVYON_LOCAL_AI_SCHEMA_APPLY=1` + `NELVYON_LOCAL_AI_USE_MAIN_DB=1` (sin DB nueva de pago), sabiendo que sin esa ventana el apply permanece bloqueado? → SÍ / NO**

| Prep | Estado |
|------|--------|
| Extension `vector` 0.8.0 en staging | INSTALLED (probe read-only) |
| Tablas `local_ai_rag_*` | **ABSENT** · apply **blocked** sin flag (exit 2) |
| Aplicar schema hoy | **NO** |

Runbook: `docs/ops/RAILWAY_PRIVATE_RAG_PREP_RUNBOOK.md`

---

## 4 — Canary IA privada en producción

**Frase para Daniel:**  
**¿Autorizas un canary mínimo productivo de IA privada (Ollama local, 0€, sin OpenAI), sabiendo que hoy `isProductionCanaryAuthorized()===false` hardcodeado y que SÍ solo autoriza el diseño — la activación exige cambio de código + kill switch documentado? → SÍ / NO**

| Prep | Estado |
|------|--------|
| Prod canary authorized | **siempre false** |
| Kill switch + rollback &lt;5 min | Documentado en `CEO_IA_PROD_CANARY_REQUEST.md` |
| Ejecutar canary hoy | **NO** |

Doc canary: `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md` · staging Router+QR ya aprobado por separado.

---

## Firma

| # | Decisión | Fecha | Firma |
|---|----------|-------|-------|
| 1 Migrate gate política | SÍ / NO | ____-__-__ | ________ |
| 2 ERP dual-write cutover | SÍ / NO | ____-__-__ | ________ |
| 3 RAG schema Railway staging | SÍ / NO | ____-__-__ | ________ |
| 4 Canary IA prod (autorizar diseño) | SÍ / NO | ____-__-__ | ________ |

**claimReady permanece false.**
