# Evidence — Staging RAG quality gap closed (full PASS)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-27 |
| Fix | `resolveEffectiveRagMinScore` — raise floor to **0.45** when `0 < chunks < 48`; large corpus keeps **0.32** |
| Thresholds lowered? | **NO** |
| Mocks? | **NO** |
| Prod canary / flags changed? | **NO** |
| claimReady | **false** · **NOT READY** |

## Results

| Gate | Result | Evidence |
|------|--------|----------|
| Staging e2e ingest/retrieval/citations/A-B app+RLS/quality | **PASS** | `pgvector-rag.live_latest.md` (run `ms3ggjey`) |
| refuse unrelated default path | **PASS** | citations=0 · effectiveMinScore=0.45 · activeChunks=4 |
| related retrieval still works | **PASS** | citations=1 · confidence=0.612 |
| Concurrent load 8× retrieve | **PASS** | ~861 ms · ok=true |
| Fail-closed / canary prep / floor unit tests | **PASS** | 54 tests |
| Prod KILL | **1** | read-only snapshot |
| Prod AI / canary / OLLAMA_CONFIGURED | **0** | read-only |
| OpenAI key / AUTONOMOUS_ALLOW_OPENAI | ABSENT / **0** | read-only |
| MCP / SM / OpenClaw | **0** | read-only |
| SCHEMA_APPLY / USE_MAIN_DB prod | **ABSENT** | read-only |

## Rollback (canary window — still OFF; verified present)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

Prod already matches this steady state (KILL ON). No flag mutations this session.

## Next

CEO SÍ/NO in `docs/ops/CEO_PROD_CANARY_OPEN_YN.md` — deploy tip with floor fix required before any canary open.
