# Canary IA flags — staging Router + Quality Routing

> **Status:** **STAGING CANARY ON (flags)** · prod **OFF** · 2026-07-23 · Coste 0  
> Evidencia: `.release-logs/canary-staging-router-qr-20260723.txt` · CEO approval signed

## Principle

Canaries are **reversible env flips**. Default prod = OFF. No OpenAI · no OpenClaw · no partner payouts.

## Staging (`ideal-victory`) — 2026-07-23

| Flag | Staging value | Notes |
|------|---------------|-------|
| `NELVYON_LOCAL_ROUTER_ENABLED` | `1` | Flag ON; runtime needs `OLLAMA_CONFIGURED=1` + private host |
| `AUTONOMOUS_QUALITY_ROUTING` | `1` | 3b fast / 8b critical (ADR-036) |
| `OLLAMA_MODEL` | `llama3.2:3b-instruct-q4_K_M` | Set |
| `OLLAMA_STRATEGY_MODEL` | `llama3.1:8b-instruct-q4_K_M` | Set |
| `NELVYON_AI_ENABLED` | `0` | Master OFF until mesh |
| `OLLAMA_CONFIGURED` | `0` | No false “configured” without host |
| `OLLAMA_HOST` | unset | Mesh Option A **not** approved |
| `AUTONOMOUS_ALLOW_OPENAI` | `0` | Forbidden |
| `NELVYON_SHARED_MEMORY_ENABLED` | `0` | Out of this batch |
| `NELVYON_MCP_PRODUCTIVE_ENABLED` | `0` | Out of this batch |
| `NELVYON_CEO_PARTNER_PAYOUTS` | `0` | Out of this batch |

## Production (`@nelvyon/web`)

All IA canary keys above: **ABSENT** (fail-closed defaults).

## Local Option C (verified)

```bash
node scripts/staging-canary-router-qr-local-probe.mjs
# ALL_PASS — Ollama loopback · vitest · generate 3b+8b · routing
```

## Rollback (immediate)

```
# Railway / staging — ideal-victory
NELVYON_LOCAL_ROUTER_ENABLED=0
AUTONOMOUS_QUALITY_ROUTING=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
# leave OLLAMA_HOST unset
```

## Next CEO gate (optional)

Approve **Option A mesh** (`ARCHITECTURE_LOCAL_AI_RUNTIME.md`) → set private `OLLAMA_HOST` + `OLLAMA_CONFIGURED=1` + `NELVYON_AI_ENABLED=1` **staging only** → then pack E2E with `P0_REQUIRE_PACK_E2E=1` against staging host (not prod).
