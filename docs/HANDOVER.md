# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-26** — **ADR-068 CEO close 2–4** · tip **`428c6c91`** · staging live **`428c6c913c4d`** · prod **`d03721c1`** · `claimReady: false` · **NOT READY** · coste **0**

| Campo | Valor |
|-------|-------|
| **Último commit tip** | 428c6c91 |
| **Fecha doc** | 2026-07-26 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Punto | Entorno | Activado | Pruebas | Rollback | Estado |
|-------|---------|----------|---------|----------|--------|
| 2 Dual-write ERP | staging | DUAL_WRITE=1 · READ=0 | equivalence + A/B + conc ALL_PASS | flag→0 | **IMPLEMENTED_VERIFIED** |
| 2 Dual-write ERP | prod | no | n/a | n/a | **OFF** |
| 3 RAG/pgvector | staging DB existente | schema+RLS+USE_MAIN_DB | e2e PASS_WITH_KNOWN_GAP · RLS A/B PASS | drop/PITR runbook | **IMPLEMENTED_VERIFIED** (critical) |
| 3 RAG/pgvector | prod | no DDL | n/a | n/a | **OFF** |
| 4 IA privada canary | prod | **no** (mesh absent) | preflight ABSENT flags | kill switch ready | **BLOCKED_EXTERNAL** (authorized in code) |

## Próximo paso EXACTO

1. Daniel: si quiere canary prod live → Railway UI `TS_AUTHKEY` + confirmar Ollama Tailscale + deploy tip ≥`428c6c91` a prod + flags mínimos (ver `private-ai.prod_canary_adr068_latest.md`); si falla cualquier gate → kill switch inmediato.
2. Legal/mercado/OAuth restantes en `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md`.
3. Opcional P2: RAG minScore corpus-size floor (`KNOWN_ISSUES.md`).
4. **No declarar READY.**

### Rollback rápido

```
# Staging ERP
NELVYON_ERP_RELATIONAL_DUAL_WRITE=0
NELVYON_ERP_RELATIONAL_READ=0

# Staging RAG
NELVYON_LOCAL_AI_USE_MAIN_DB=0
# unset LOCAL_AI_DATABASE_URL if needed

# Prod canary (si alguna vez se abre ventana)
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
