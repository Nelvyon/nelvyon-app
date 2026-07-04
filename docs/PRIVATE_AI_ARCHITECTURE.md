# Nelvyon Private AI — Technical Architecture (Prep Phase)

**Status:** Infrastructure ready. No model installed. No OpenClaw connected. No RAG ingest.

---

## 1. Philosophy

Nelvyon builds its **own** private AI platform:

- Models are **plugins**, not dependencies
- OpenClaw is an **optional bridge**, not the brain
- Default state: **prepared but unconfigured**
- Connecting a model later = set env vars + run migrate

---

## 2. Layer diagram

```
┌──────────────────────────────────────────────────────────────┐
│ Products: SaaS · OS · Portal · Packs · Workflows · CRM       │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│ API: /api/saas/private-ai/*                                  │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│ SaasPrivateAiService (facade)                                  │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│ PrivateAiOrchestrator                                        │
│  permissions · memory · rag(read) · router · audit · approvals│
└─────┬──────────┬──────────┬──────────┬──────────┬───────────┘
      │          │          │          │          │
   Registry   Memory     RAG       Router    OpenClaw
   + Perms   Adapter   (empty)   + Providers  (stub)
```

---

## 3. Database (migrations 503–504)

| Table | Purpose |
|-------|---------|
| `saas_private_ai_settings` | Tenant AI mode + model prefs |
| `saas_private_ai_audit` | Every agent run logged |
| `saas_private_ai_approvals` | Human approval queue |
| `saas_private_ai_agent_overrides` | Per-tenant agent/tool overrides |
| `nelvyon_rag_chunks` | Platform docs (ingest future) |

---

## 4. Environment variables

### Master switches

```bash
NELVYON_AI_ENABLED=0          # Default OFF — no LLM activity
NELVYON_AI_MODE=unconfigured  # unconfigured | stub | local | openai | anthropic | auto
PRIVATE_AI_ONLY=0             # When 1, blocks remote providers
```

### Local runtime (future — do not set until Ollama installed)

```bash
OLLAMA_CONFIGURED=0           # Set 1 only after local runtime is running
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b       # Or llama3, mistral, deepseek — when chosen
```

### Optional remote (never required)

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### OpenClaw bridge (future — disabled)

```bash
NELVYON_OPENCLAW_BRIDGE_ENABLED=0
NELVYON_OPENCLAW_BRIDGE_URL=
```

---

## 5. API endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/saas/private-ai` | Settings + platform status |
| PATCH | `/api/saas/private-ai` | Update tenant settings |
| GET | `/api/saas/private-ai/status` | Provider readiness |
| GET | `/api/saas/private-ai/agents` | Agent registry |
| POST | `/api/saas/private-ai/agents` | Run agent (advise) |
| GET | `/api/saas/private-ai/approvals` | Pending approvals |
| POST | `/api/saas/private-ai/approvals` | Approve/reject |
| GET | `/api/saas/private-ai/audit` | Recent audit log |

Response fields (always present on agent runs):

- `mock` — true only in stub dev mode
- `configured` — false when no model connected
- `ready` — true only when real LLM responded

---

## 6. Provider system

| Provider ID | Type | When active |
|-------------|------|-------------|
| `unconfigured` | internal | Default — AI disabled or no model |
| `stub` | internal | `NELVYON_AI_MODE=stub` (dev) |
| `local_ollama` | local | `ENABLED=1` + `OLLAMA_CONFIGURED=1` + reachable |
| `openai` | remote | Optional key + not private-only |
| `anthropic` | remote | Optional key + not private-only |

Add new providers: implement `ILlmProvider`, register in `ProviderRegistry`.

---

## 7. Agent registry (17)

CEO, Ventas, CRM, Soporte, SEO, Google/Meta/TikTok Ads, Email, Contenido, Workflows, Reporting, Dev, QA, Finanzas, Portal, Security.

Each agent defines: role, tools, limits, forbidden actions, approval-required actions.

Pilot agent: `ceo_supervisor` (read-only advisory).

---

## 8. Adapters (prepared, not wired)

### OsLlmClientAdapter

Maps `ILlmClient` (OS packs) → `PrivateAiRouter`. Import when migrating OS off OpenAI-only client:

```typescript
import { createOsLlmClientAdapter } from "@nelvyon/saas";
const llm = createOsLlmClientAdapter(tenantSettings);
```

### OpenClawBridge

Interface `IOpenClawBridge` with `DisabledOpenClawBridge` default. Replace via `setOpenClawBridge()` when integrating — Nelvyon core unchanged.

---

## 9. What is NOT done (by design)

- [ ] Ollama / model download
- [ ] OpenClaw integration
- [ ] RAG ingest from docs/
- [ ] Agent management UI
- [ ] Wiring OsLlmClientAdapter into 193 OS agents
- [ ] Production smokes for private-ai

---

## 10. Future activation checklist

When Nelvyon product is complete and you choose a model:

1. Install Ollama (or compatible runtime) on target host
2. Pull chosen open model (Qwen, Llama, Mistral, DeepSeek, etc.)
3. Set `NELVYON_AI_ENABLED=1`, `OLLAMA_CONFIGURED=1`, `NELVYON_AI_MODE=local`
4. Verify `GET /api/saas/private-ai/status` → `ready: true`
5. Run RAG ingest (phase 2b)
6. Evaluate OpenClaw bridge (optional)
7. Wire `OsLlmClientAdapter` into OS pipelines (optional)

No code rewrite required — only configuration and ingest scripts.
