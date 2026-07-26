> **2026-07-26** — ADR-068/069 prod canary attempt · tip **`1eaed9f2`** · prod kill ON · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** |
| **Repo tip** | `1eaed9f2` |
| **Staging live** | `428c6c913c4d` (prior ADR-068) |
| **Prod live** | `1eaed9f2d859` · KILL ON · AI OFF |
| **#1 Migrate gate** | **CEO SÍ** (ADR-067) · fail-closed · no migrate nueva |
| **#2 Dual-write ERP** | **IMPLEMENTED_VERIFIED staging** · READ=0 · **prod OFF** |
| **#3 RAG Railway** | **IMPLEMENTED_VERIFIED staging** (critical) · **prod DDL OFF** |
| **#4 Canary IA prod** | Mesh+routes+kill **VERIFIED** · inference **FAIL** (:5434) · **ATTEMPTED_FAIL_CLOSED** |
| **Coste** | **0** |
| **Pendiente humano** | local-AI DB path (USE_MAIN_DB/DDL o code) · legal/mercado/OAuth (`CEO_MASTER_ACTIONS_CURSOR_CLOSED.md`) |

SSOT: `HANDOVER.md` · ADR-069 · `private-ai.prod_canary_adr068_latest.md`
