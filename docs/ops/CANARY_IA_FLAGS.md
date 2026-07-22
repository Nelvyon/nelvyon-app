# Canary IA flags — prep only (all OFF by default)

> **Status:** PREPARADO · **no activated** · 2026-07-22 · Coste 0  
> Prod SHA live: tip post-517 deploy · Flags Railway: **ABSENT** · OpenAI key **revoked/absent**

## Principle

Canaries are **reversible env flips**. Default = OFF. No OpenAI · no OpenClaw · no partner payouts in this canary set.

## Flags (entry criteria)

| Flag | Default | Canary ON value | Depends on |
|------|---------|-----------------|------------|
| `NELVYON_AI_ENABLED` | OFF (`0`) | `1` | CEO |
| `OLLAMA_CONFIGURED` / host | OFF | `1` + private `OLLAMA_HOST` | Arch Option A/B |
| `NELVYON_LOCAL_ROUTER_ENABLED` | OFF (`0`) | `1` | OLLAMA configured |
| `NELVYON_SHARED_MEMORY_ENABLED` | OFF | `1` | mig 514–516 · RLS |
| `NELVYON_MCP_PRODUCTIVE_ENABLED` | OFF | `1` | AI enabled optional |
| `AUTONOMOUS_QUALITY_ROUTING` | OFF | `1` | OLLAMA_STRATEGY_MODEL |
| `AUTONOMOUS_ALLOW_OPENAI` | **never in canary** | — | Forbidden default |
| `NELVYON_OPENCLAW_*` | OFF | — | Out of scope |
| `NELVYON_CEO_PARTNER_PAYOUTS` | OFF | — | Out of scope |

## Entry metrics (before ON)

1. Health live/ready 200  
2. `assertOllamaHostSafeForRuntime({ allowLoopback: false })` PASS for remote  
3. Tenant isolation smoke (SaaS UUID) PASS  
4. Pack gate / unit tests green  
5. Rollback plan written (below)

## Rollback (immediate)

```
# Railway / staging — unset or set 0 (CEO ops)
NELVYON_AI_ENABLED=0
NELVYON_LOCAL_ROUTER_ENABLED=0
NELVYON_SHARED_MEMORY_ENABLED=0
NELVYON_MCP_PRODUCTIVE_ENABLED=0
AUTONOMOUS_QUALITY_ROUTING=0
# leave OLLAMA_* unset to fail-closed
```

Redeploy not always required for env-only; verify health after.

## Tenant isolation checks

- Shared Memory queries scoped by `tenant_id` UUID  
- MCP tools deny cross-tenant args  
- Pack runs workspace/tenant scoped  

## CEO single approval request (batch)

Approve **staging-first** canary of: Local Router + Quality Routing (+ optional Shared Memory).  
**Do not** approve OpenAI, OpenClaw, or partner payouts in the same batch.

**Documento formal:** `docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md` (firma pendiente).

## Local probe / metrics (prep)

```ts
import { collectLocalAiPrepMetrics, getLocalAiRuntimePrepSnapshot } from "../backend/local-ai/OllamaRuntimePrep";
// Never enables flags. Fail-closed when host unset / loopback remoto.
```

Timeout default probe: **5000 ms**. Rollback hints en snapshot.
