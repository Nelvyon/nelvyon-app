# ADR-068 — Informe cierre puntos 2–4 (2026-07-26)

| Punto | Entorno | Activado | Pruebas | Rollback | Estado |
|-------|---------|----------|---------|----------|--------|
| 2 Dual-write ERP | staging | DUAL_WRITE=1 · READ=0 | JSONB↔`erp_suppliers` equivalence PASS · A/B ALL_PASS · concurrency ALL_PASS · vitest mirror PASS | flag→0 (+ redeploy) | **IMPLEMENTED_VERIFIED** |
| 2 Dual-write ERP | prod | no | n/a | n/a | **OFF** |
| 3 RAG/pgvector | staging (DB existente) | schema `local_ai_*` + RLS role + USE_MAIN_DB | ingest/embed/retrieve/citas · app+RLS A/B PASS · quality minScore P2 gap | USE_MAIN_DB=0 / PITR | **IMPLEMENTED_VERIFIED** (critical) |
| 3 RAG/pgvector | prod | no DDL | n/a | n/a | **OFF** |
| 4 IA privada canary | prod | **no** | preflight flags ABSENT · tip prod sin gates | kill switch ready | **BLOCKED_EXTERNAL** (code AUTHORIZED) |

## SHAs

| Capa | SHA |
|------|-----|
| Código tip | `428c6c91` |
| Staging live | `428c6c913c4d` |
| Prod live | `d03721c19916` |

## Coste

**Incremental 0** (sin DB nueva, sin réplica, sin OpenAI, sin suscripción, sin crédito IA).

## Bloqueos externos/legales reales (únicos)

1. **`TS_AUTHKEY` / mesh Tailscale prod** — requerido para canary IA live (Daniel / Railway UI).
2. **Legal Pepito + mass-send** — `claimReadyLegal` hard-false.
3. **OAuth / Twilio / iOS stores / mercado** — `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md`.
4. **2ª réplica Railway** — COST (no activada).

## claimReady

**false** · **NOT READY**
