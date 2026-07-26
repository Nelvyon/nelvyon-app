# Private AI production canary — ADR-068 attempt (CEO TS_AUTHKEY)

> Fecha: **2026-07-26** · coste incremental **0** · OpenAI **ABSENT/OFF** · Pepito **untouched** · **claimReady: false** · **NOT READY**

## Authorization

| Gate | Result |
|------|--------|
| CEO written SÍ + `TS_AUTHKEY` configured | **YES** |
| `PRODUCTION_CANARY_CEO_CODE_ACK` | **true** (tip ≥`428c6c91`) |
| OpenAI / OpenClaw / MCP prod / Shared Memory prod / campañas / pagos / ads / DMs | **OFF** |

## Production tip / deploys

| Item | Value |
|------|-------|
| Tip live (post-fix) | **`1eaed9f2`** |
| Canary window deploy | `f778bed9-3d6c-4426-9b5d-8db0c929c412` SUCCESS |
| Kill deploy | `ff843eae-3980-45fb-83c2-6419e691c7c1` SUCCESS |
| Prior FAIL tip | `8856d5dc` (routes excluded by `.dockerignore`) |

## Gate matrix (real)

| Gate | Result | Evidence |
|------|--------|----------|
| MESH_JOIN_OK | **PASS** | deploy logs hostname `nelvyon-prod-web-canary` |
| live / ready | **PASS** | HTTP 200 |
| Routes in image | **PASS** after `1eaed9f2` | prior HTML 404 = `.dockerignore` exclude |
| status + no OpenAI egress | **PASS** | smoke |
| tenant isolation (status A/B) | **PASS** | smoke |
| router `mode=route` → 3B fast | **PASS** | `llama3.2:3b-instruct-q4_K_M` |
| router-health `certified` | **FAIL** | `ok:false` · `postgres:false` (early return before Ollama probe) |
| inference `mode=execute` | **FAIL** | `ECONNREFUSED 127.0.0.1:5434` (`LOCAL_AI` default DB) |
| Kill switch | **PASS** | vars set **~1.27s** · AI/canary off · live/ready 200 |
| claimReady / READY | **false** | legal + clients pending |

## Root causes (honest)

1. **`.dockerignore`** excluded `inference` / `router-health` / `metrics` → HTML 404 under auth (middleware 401 without cookie masked absence). Fixed in tip `1eaed9f2`.
2. **`getLocalAiConfig()`** falls back to `postgresql://…@127.0.0.1:5434/nelvyon_local_ai` when `LOCAL_AI_DATABASE_URL` unset and `NELVYON_LOCAL_AI_USE_MAIN_DB≠1`. Prod canary did **not** set USE_MAIN_DB (prod RAG DDL still OFF). `executeTask` therefore refused local Postgres → inference FAIL.
3. Router health `ollama:false` in payload is **not** proof Ollama is down: health returns early on postgres fail before Ollama check. `fastModelAvailable`/`strategyModelAvailable` were **true** during smoke (tags reachable via Tailscale).

## Final production flags (sane)

| Flag | Value |
|------|-------|
| `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH` | **1** |
| `NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED` | **0** |
| `NELVYON_AI_ENABLED` | **0** |
| `OLLAMA_CONFIGURED` | **0** |
| `AUTONOMOUS_ALLOW_OPENAI` | **0** |
| `OPENAI_API_KEY` | **ABSENT** |
| `NELVYON_MESH_OPTION_A` | **1** (mesh prep retained) |
| `TS_AUTHKEY` | **SET** (redacted) |

## Verdict

| Layer | Estado |
|-------|--------|
| Mesh + routes + kill drill | **VERIFIED** |
| Full private-AI canary (inference) | **NOT IMPLEMENTED_VERIFIED** — blocked on local-AI DB default / missing USE_MAIN_DB or prod `local_ai_*` schema |
| claimReady | **false** · **NOT READY** |

## Next exact step (before any reopen)

1. Keep kill ON / AI OFF until intentional reopen.
2. Choose one CEO-safe path for router DB: (A) confirm/apply `local_ai_*` on prod DB + `NELVYON_LOCAL_AI_USE_MAIN_DB=1` under ADR-064 approval, **or** (B) code fail-closed: never use `127.0.0.1:5434` in production + inference path that does not require local AI Postgres for minimal canary.
3. Reopen minimal window → smoke must PASS inference + kill drill → leave killed or CEO-extend.
4. **Do not declare READY** while legal campañas / clients reales pending.
