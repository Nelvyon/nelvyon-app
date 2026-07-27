# Private AI production canary — CEO SÍ attempt (2026-07-27) · FAIL → KILL

> **claimReady: false** · **NOT READY** · OpenAI ABSENT · coste **0** · Pepito untouched

## Authorization

| Item | Value |
|------|-------|
| CEO SÍ | **YES** (written 2026-07-27) |
| Conditions | Tailscale Ollama only · MCP/SM/OpenClaw/pagos/campañas/ads OFF · kill on any gate fail |

## Deploy / tip

| Item | Value |
|------|-------|
| Tip (ADR-070) | **`775f7537`** |
| Prod deploy (railway up) | **`dd1f9922`** SUCCESS |
| Live `git_sha` | `null` (railway up upload; tip documented here) |
| Env flip rebuild (during smoke) | `fc6fd29a` still BUILDING |

## Gate matrix (real)

| Gate | Result | Detail |
|------|--------|--------|
| health live/ready | **PASS** | ready ok |
| tenants A/B synthetic | **PASS** | onboarded |
| router-health | **PASS** | certified=true · postgres=true · ollama=true |
| no OpenAI egress | **PASS** | key ABSENT · status no openai |
| router route → 3B | **PASS** | `llama3.2:3b-instruct-q4_K_M` |
| inference execute | **FAIL** | HTTP 500 `{"error":"Internal error"}` |
| audit logs path | **PASS** | `{items:[]}` |
| isolation B status | **PASS** | no A tenant id |
| auth required | **PASS** | 401 |
| RAG citations / A-B RLS (this run) | **NOT RUN** | aborted after inference fail |
| Kill switch | **PASS** | ~**1.31 s** · KILL=1 · canary=0 · AI=0 · OLLAMA_CONFIGURED=0 |

## Root cause (honest)

1. **Race env↔serving instance:** flags set (`PROD_CANARY_ENABLED=1` …) triggered Railway **BUILDING** deploy `fc6fd29a`. Smoke ran before that deploy was SUCCESS. Serving process still lacked `NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=1`.
2. Log evidence: `[saasErrorBody] PRIVATE_AI_CANARY_BLOCKED: set NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=1 for the canary window`.
3. **Secondary:** `saasErrorBody` masked that intentional fail-closed as opaque HTTP **500 Internal error**, hiding the real gate from the smoke.

Not a Tailscale/Ollama outage: router-health reported `ollama:true` / `postgres:true` / certified.

## Correction (code — next tip)

- Map `PRIVATE_AI_CANARY_BLOCKED` → HTTP **403** + `code` (not 500).
- Smoke waits until execute is not canary-blocked (or timeout) before scoring inference.

## Steady state after kill (verified)

| Flag | Value |
|------|-------|
| `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH` | **1** |
| `NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED` | **0** |
| `NELVYON_AI_ENABLED` | **0** |
| `OLLAMA_CONFIGURED` | **0** |
| `AUTONOMOUS_ALLOW_OPENAI` | **0** |
| `OPENAI_API_KEY` | **ABSENT** |
| MCP / SM / OpenClaw | **0** |

## Verdict

| Layer | Estado |
|-------|--------|
| Mesh + router-health + kill | **VERIFIED** |
| Full canary inference | **FAIL** (env race) → **NOT IMPLEMENTED_VERIFIED** |
| claimReady | **false** |

## Next

No reopen until correction tip is deployed and CEO confirms retry (or original SÍ + correction applied).  
Do **not** declare READY.
