# Nelvyon Private AI — Architecture

Modular, model-agnostic infrastructure. **No LLM is required** for Nelvyon to run.

## Folder structure

```
backend/private-ai/
├── types.ts                 # Shared interfaces
├── config.ts                # Env parsing + feature flags
├── privateMode.ts           # PRIVATE_MODE=ON egress policy (default)
├── sensitiveActions.ts      # Approval-required actions
├── nelvyonAgentRegistry.ts  # 17 expert agents (catalog)
├── PrivateAiRouter.ts       # Re-export → core/
├── core/
│   ├── PrivateAiRouter.ts   # Provider chain resolution
│   └── ProviderRegistry.ts  # Pluggable provider list
├── providers/
│   ├── UnconfiguredProvider.ts  # Default — zero network
│   ├── StubProvider.ts          # Dev only (mock:true)
│   ├── LocalOllamaProvider.ts   # Future local runtime
│   ├── OpenAiProvider.ts        # Optional remote
│   └── AnthropicProvider.ts     # Optional remote
├── agents/
│   └── AgentPermissionService.ts
├── memory/
│   └── TenantMemoryAdapter.ts   # → SaasTenantMemoryService
├── audit/
│   └── PrivateAiAuditService.ts
├── approvals/
│   └── PrivateAiApprovalService.ts
├── rag/
│   ├── IRagStore.ts             # Contract only
│   └── NelvyonRagStore.ts       # Read-only; no ingest yet
├── adapters/
│   ├── OsLlmClientAdapter.ts    # OS ILlmClient bridge (not wired)
│   └── OpenClawBridge.ts        # Optional; disabled by default
└── orchestrator/
    └── PrivateAiOrchestrator.ts # Composes all layers
```

## Activation ladder (when ready)

| Step | Env vars | Effect |
|------|----------|--------|
| 0 (now) | defaults (`PRIVATE_MODE=ON`) | `unconfigured`, no remote network |
| Dev stub | `NELVYON_AI_ENABLED=1` + `NELVYON_AI_MODE=stub` | Deterministic dev responses |
| Local model | + `OLLAMA_CONFIGURED=1` + `NELVYON_AI_MODE=local` | Ollama on 127.0.0.1 only |
| Task Internet | `PRIVATE_MODE_INTERNET_UNTIL=<ISO>` | Temporary authorized outbound window |
| Disable privacy | `PRIVATE_MODE=OFF` | Owner only — enables remote providers if configured |

## Design rules

1. **Nelvyon owns agents** — OpenClaw is plug-in, not core.
2. **`ready: true`** only when a real LLM answered.
3. **`mock: true`** only from `StubProvider` (dev).
4. **Tenant isolation** — all DB queries scoped by `tenant_id`.
5. **Sensitive actions** — always approval queue, never auto.

See `docs/PRIVATE_AI_ARCHITECTURE.md` for full technical spec.
