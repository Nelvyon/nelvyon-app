# Canary IA flags — staging Router + Quality Routing + Mesh prep

> **Status:** STAGING flags ON · Mesh local **PASS** · Railway **WAITING_TS_AUTHKEY** · prod **OFF** · 2026-07-23 · Coste 0  
> SSOT mesh: `docs/ops/MESH_OPTION_A_STAGING.md` · ADR-041/042

## Staging (`ideal-victory`)

| Flag | Value | Notes |
|------|-------|-------|
| `NELVYON_LOCAL_ROUTER_ENABLED` | `1` | Canary |
| `AUTONOMOUS_QUALITY_ROUTING` | `1` | 3b/8b |
| `OLLAMA_MODEL` / `OLLAMA_STRATEGY_MODEL` | 3b / 8b | Set |
| `NELVYON_MESH_OPTION_A` | `1` | Prep marker |
| `OLLAMA_HOST` | Tailscale IPv4 URL | Set on Railway staging (not in git) |
| `NELVYON_AI_ENABLED` | `0` | Until `TS_AUTHKEY` + redeploy |
| `OLLAMA_CONFIGURED` | `0` | Until Railway node online |
| `TS_AUTHKEY` | — | **CEO paste via Railway UI only** |
| `AUTONOMOUS_ALLOW_OPENAI` | `0` | Forbidden |

## Production

Mesh/IA canary keys: **ABSENT**.

## Rollback

```
NELVYON_MESH_OPTION_A=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
# unset OLLAMA_HOST TS_AUTHKEY
NELVYON_LOCAL_ROUTER_ENABLED=0
AUTONOMOUS_QUALITY_ROUTING=0
```

## CEO next

Exact clicks: `docs/ops/MESH_OPTION_A_STAGING.md` § Manual CEO clicks.
