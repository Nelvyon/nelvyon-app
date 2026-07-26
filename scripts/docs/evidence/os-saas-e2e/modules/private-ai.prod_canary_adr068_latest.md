# Private AI production canary — ADR-068 evidence

> Fecha: **2026-07-26** · coste incremental **0** · OpenAI **ABSENT/OFF** · Pepito **untouched**

## Authorization

| Gate | Result |
|------|--------|
| CEO written SÍ (points 2–4 close) | **YES** |
| `PRODUCTION_CANARY_CEO_CODE_ACK` | **true** (tip `428c6c91`) |
| Runtime gates wired (`assertPrivateAiProdCanaryRuntimeAllowed` + kill switch) | **YES** in tip |
| OpenAI / OpenClaw / MCP prod / Shared Memory prod | **OFF** (not activated) |

## Production preflight (boolean presence only)

| Flag / resource | Prod `ideal-victory` |
|-----------------|----------------------|
| Live SHA | `d03721c19916` (**not** tip with canary gates) |
| `NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED` | **ABSENT** |
| `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH` | **ABSENT** |
| `NELVYON_AI_ENABLED` | **ABSENT** |
| `OLLAMA_HOST` / `OLLAMA_CONFIGURED` | **ABSENT** |
| `TS_AUTHKEY` (Tailscale mesh Option A) | **ABSENT** |
| `OPENAI_API_KEY` / `AUTONOMOUS_ALLOW_OPENAI` | **ABSENT** |
| Dual-write / RAG DDL flags | **ABSENT** (correct — prod must stay OFF) |

## Verdict

| Layer | Estado |
|-------|--------|
| Code + CEO ack | **PREPARED + AUTHORIZED** on tip `428c6c91` |
| Live production canary window | **NOT ACTIVATED** |
| Reason | **BLOCKED_EXTERNAL** — missing Tailscale mesh (`TS_AUTHKEY`) + Ollama reachability on prod service; tip not deployed to prod |
| Action taken | **Stopped canary activation only** (per CEO limits: no irreversible/degraded prod). Evidence preserved. Staging dual-write + RAG continued. |
| claimReady | **false** |

## Required before IMPLEMENTED_VERIFIED (prod canary)

1. Daniel pastes `TS_AUTHKEY` (Railway UI) + confirms Ollama Tailscale IP reachable from Railway prod.
2. Deploy tip ≥ `428c6c91` to production (canary gates present).
3. Set minimal window flags only:
   - `NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=1`
   - `NELVYON_AI_ENABLED=1`
   - `OLLAMA_HOST=http://<tailscale-ip>:11434`
   - `OLLAMA_CONFIGURED=1`
   - `AUTONOMOUS_ALLOW_OPENAI=0` (explicit)
   - kill switch unset/0
4. Smoke: health · inference · tenant isolation · timeout · Ollama down · kill switch · rollback &lt;5 min · zero OpenAI egress.
5. On any gate fail → `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1` immediately.

## Rollback (ready, unused)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
AUTONOMOUS_ALLOW_OPENAI=0
# unset OLLAMA_HOST OLLAMA_CONFIGURED if needed
```
