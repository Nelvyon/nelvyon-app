# Mesh Option A — STAGING only (Tailscale → Ollama local)

> **Status 2026-07-24 (post-mesh cierre):** LOCAL PRIVATE **PASS** · tip/live `99b30730` · deploy `c2e48d13` **SUCCESS** · live/ready **200** · Tailscale join **PASS** (`MESH_JOIN_OK`) · peer `nelvyon-staging-web-3` **active** · Pack E2E **ALL_PASS completed** · Portal packs **ALL_PASS** · Prod IA flags **ABSENT** (OpenAI key ABSENT) · Coste **0** · `claimReady: false`  
> ADR-042 · ADR-043 · ADR-044 · ADR-045 · ADR-046 · Evidence: `.release-logs/pack-e2e-99b30730-*.txt`

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
| Deploy | `c2e48d13` SUCCESS · live SHA `99b30730` |
| Ollama listen | Tailscale IPv4 **only** (loopback closed · public blocked) |
| Mesh session | ESTABLISHED staging→Ollama `100.97.102.64`→`100.102.207.30:11434` |
| Staging `live` / `ready` | **200** |
| Staging Tailscale join | **PASS** — `MESH_JOIN_OK proxies_set=1` |
| Staging peer | `nelvyon-staging-web-3` `100.97.102.64` **active** |
| Staging AI flags | AI=1 · OLLAMA=1 · MESH=1 · OpenAI=0 · Router=1 · QR=1 · MCP=0 · SM=0 · PAY=0 |
| Prod IA/mesh flags | **ABSENT** (incl. `OPENAI_API_KEY`, `AUTONOMOUS_ALLOW_OPENAI`) |
| Pack E2E | Kickoff **202** · status **completed** · 5 deliverables auto-approve · portal invite PASS |
| Portal packs | **ALL_PASS** |
| Tenant isolation | vitest 16/16 |

## Emergency rollback (exactly two flags → 0)

On Railway **staging** / `ideal-victory` → Variables:

1. `NELVYON_AI_ENABLED` = `0`  
2. `OLLAMA_CONFIGURED` = `0`  

Then redeploy staging (or wait for restart). This fail-closes IA immediately without touching production.

Optional cleanup: unset `TS_AUTHKEY` · set `NELVYON_MESH_OPTION_A=0`.
