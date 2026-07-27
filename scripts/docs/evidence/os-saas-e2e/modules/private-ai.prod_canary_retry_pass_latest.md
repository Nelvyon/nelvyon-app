# Private AI production canary — CEO retry PASS (2026-07-27)

> **claimReady: false** · **NOT READY** · OpenAI ABSENT · coste **0** · Pepito untouched

## Authorization

| Item | Value |
|------|-------|
| CEO SÍ (open) | 2026-07-27 |
| CEO SÍ (retry after fix) | 2026-07-27 |
| Tip | **`8c5c2768`** |
| Deploy correction | **`5ef3b8d8`** SUCCESS |
| Deploy canary window | **`8f348e61`** SUCCESS |
| Live git_sha during smoke | **`8c5c27682411`** |

## Gate matrix (real)

| Gate | Result | Detail |
|------|--------|--------|
| health live/ready | **PASS** | sha=8c5c27682411 · ready ok |
| canary.window_ready | **PASS** | waited until execute HTTP 200 |
| router-health | **PASS** | certified · postgres · ollama |
| no OpenAI egress | **PASS** | enabled path · key ABSENT · privateMode |
| route → 3B | **PASS** | `llama3.2:3b-instruct-q4_K_M` |
| inference execute | **PASS** | 118 chars · **4668 ms** |
| audit logs | **PASS** | tenant-scoped router_execute rows |
| isolation A/B status | **PASS** | no A id in B |
| auth required | **PASS** | 401 |
| RAG ingest/embeddings/citations | **PASS** | prod DB · run `ms3jzb7z` |
| RAG A/B app + RLS | **PASS** | RLS 0 rows cross-tenant |
| RAG quality refuse (floor 0.45) | **PASS** | unrelated citations=0 |
| Kill drill | **PASS** | **~1.53 s** |

HTTP evidence: `private-ai.prod_canary_smoke_latest.md`  
RAG evidence: `pgvector-rag.prod_canary_latest.md`

## Steady after kill drill (current)

| Flag | Value |
|------|-------|
| `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH` | **1** |
| `NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED` | **0** |
| `NELVYON_AI_ENABLED` | **0** |
| `OLLAMA_CONFIGURED` | **0** |
| `AUTONOMOUS_ALLOW_OPENAI` | **0** |
| `OPENAI_API_KEY` | **ABSENT** |
| MCP / SM / OpenClaw | **0** |

## Rollback recipe (proven)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

## Verdict

| Layer | Estado |
|-------|--------|
| Minimal private AI canary (Tailscale Ollama) | **IMPLEMENTED_VERIFIED** (window) |
| Post-drill steady | **KILLED** (safe) |
| claimReady / product READY | **false** / **NOT READY** |

## Pendientes reales

| Pendiente | Estado |
|-----------|--------|
| Legal / GDPR / contratos | pendiente |
| Proveedores OAuth / Twilio / ads spend | pendiente |
| Clientes reales en canary | no (solo sintéticos) |
| Extender ventana canary ON (opcional) | CEO decide |
| GitHub→Railway auto-deploy (tip SKIPPED) | ops debt — used `railway up` |
