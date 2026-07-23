# Mesh Option A — STAGING only (Tailscale → Ollama local)

> **Status 2026-07-23 (final verify):** LOCAL PRIVATE **PASS** · Deploy `6aeb4106` **SUCCESS** · live/ready **200** · Tailscale join **PASS** (`MESH_JOIN_OK`) · peer `nelvyon-staging-web-1` **active** · Pack E2E mesh **PASS** (`needs_review`, Ollama real) · Prod IA flags **ABSENT** · Coste **0** · `claimReady: false`  
> ADR-042 · ADR-043 · ADR-044 · ADR-045 · Evidence: Railway logs `MESH_JOIN_OK` · pack `f5de9c43`

## Scope (CEO-approved)

| Allow | Deny |
|-------|------|
| Staging `ideal-victory` only | Production `@nelvyon/web` |
| Tailscale private overlay | Funnel · Serve · exit node · subnet routing |
| Ollama on Tailscale IP only | Public `0.0.0.0` bind · ngrok · open CF tunnel |
| Open-weight 3b/8b | OpenAI · OpenClaw · payouts · campañas |

## Verification matrix (this pass)

| Check | Result |
|-------|--------|
| Deploy | `6aeb4106` SUCCESS (async kickoff + LF entrypoint) |
| Ollama listen | Tailscale IPv4 **only** (loopback closed · public blocked) |
| Ollama private `/api/tags` + 3b/8b generate | **PASS** |
| Staging `live` / `ready` | **200** |
| Staging Tailscale join | **PASS** — `MESH_JOIN_OK proxies_set=1` |
| Staging peer | `nelvyon-staging-web-1` `100.71.134.87` **active** (old `nelvyon-staging-web` offline) |
| Staging AI flags | AI=1 · OLLAMA=1 · MESH=1 · OpenAI=0 · Router=1 · QR=1 · MCP=0 · SM=0 · PAY=0 |
| Prod IA/mesh flags | **ABSENT** (residual `OPENAI_API_KEY` PRESENT, gates OFF) |
| Pack E2E | Kickoff **202** · run `f5de9c43` **needs_review** · real 3b/8b · deliverables_published=5 |
| Unit tests | **44/44 PASS** |

## Emergency rollback (exactly two flags → 0)

On Railway **staging** / `ideal-victory` → Variables:

1. `NELVYON_AI_ENABLED` = `0`  
2. `OLLAMA_CONFIGURED` = `0`  

Then redeploy staging (or wait for restart). This fail-closes IA immediately without touching production.

Optional cleanup: unset `TS_AUTHKEY` · set `NELVYON_MESH_OPTION_A=0`.

## Auth key policy (staging)

- Prefer **Reusable ON** + ephemeral nodes for canary (redeploys must not burn the key).  
- Never paste full keys into chat/docs/git.  
- Optional: set `TS_HOSTNAME=nelvyon-staging-web` to stabilize peer name.

## Async kickoff (ADR-045)

Mesh packs return **HTTP 202** after run row creation; clients must poll `/api/os/packs/{packId}/{runId}`.  
Sync: `X-Pack-Sync: 1` or `NELVYON_PACK_KICKOFF_ASYNC=0` (not recommended for 8B mesh).
