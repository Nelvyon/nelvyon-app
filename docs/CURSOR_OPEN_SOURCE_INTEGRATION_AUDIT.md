# CURSOR / OPEN SOURCE INTEGRATION AUDIT

> Auditoría honestidad · **2026-07-19** · Workforce Bloque H  
> Objetivo: qué integrar, adaptar, posponer o rechazar — sin aspiraciones.

**Leyenda decisión:** `integrate` | `adapt` | `postpone` | `reject`

---

## Tabla

| Resource | Repo / origen | License (best-effort) | Maintenance | Security | Compatibility | Duplicity | Benefit | Maintenance cost | Decision | Evidence |
|----------|---------------|----------------------|-------------|----------|---------------|-----------|---------|------------------|----------|----------|
| Cursor Rules hierarchy (`.cursor/rules`, CLAUDE.md, live-docs) | Local / Cursor product | Proprietary Cursor + repo MIT/private | Alta (equipo) | Alta si rules alwaysApply | Nativa | Baja | Continuidad + gates calidad | Bajo | **adapt** | `enterprise-quality.mdc`, `live-documentation.mdc`, HANDOVER |
| Cursor Agent / Composer | Cursor | Proprietary | Vendor | Sandbox IDE | Windows OK | — | Dev velocity | Medio (vendor) | **integrate** (ya) | Uso diario; no sustituye daemon |
| OrchestratorDaemon + persist | `backend/orchestrator/*` | Repo | Alta | Kill switch + deny lists | Node 20 | — | Runtime sin IDE | Medio | **integrate** (ya) | Bloque C tests + compose profile |
| MCP productivo NELVYON | `backend/mcp/**` | Repo | Alta | Policy + soak cert | Local | — | Tools tenant-safe | Medio | **integrate** (ya) | `mcp_certification_final.json` |
| MCP GitHub (oficial) | `@modelcontextprotocol` / GitHub | MIT (SDK) típico | Media | Tokens; scope PRs | Cursor MCP | Solapa con `gh` CLI | Issues/PRs desde agent | Medio | **postpone** | No wired prod; ops tokens |
| MCP Git / FS | MCP reference servers | MIT típico | Media | Path allowlist crítica | Cursor | Solapa FS tools Cursor | Lectura repo | Bajo–medio | **adapt** patrones | Preferir tools Cursor + deny-by-default |
| MCP Postgres | community / official variants | MIT/Apache típico | Media | **Alto riesgo** si write | Local Docker | Solapa `pg` pool app | Debug schema | Alto | **postpone** | Solo read-only si algún día; RLS |
| MCP Docker | community | Variada | Baja–media | Socket Docker = root-ish | Desktop | Compose scripts ya | Ops containers | Alto | **postpone** | `local-ai-up.mjs` suficiente |
| MCP Playwright | Microsoft / community | Apache-2.0 típico | Media | Browser automation | CI | Playwright E2E ya en repo | UI smoke agent | Medio | **adapt** | Reusar suite UI_CONTRACT; no segundo runner |
| Paid MCP marketplaces | Varios vendors | Proprietary / SaaS | Vendor | Data egress | Cloud | Alto vs PRIVATE_MODE | Marginal | Alto ($$) | **reject** / **postpone** | PRIVATE_MODE; “No paid tools” en tool map |
| Ollama | `ollama/ollama` | MIT | Alta | Local inference | Win/Linux | — | LLM local | Medio | **integrate** (ya) | Phase 2 Elite live |
| pgvector | `pgvector/pgvector` | PostgreSQL | Alta | DB ACL | Compose | — | RAG local | Medio | **integrate** (ya) | Residual ops KI-016/018 |
| OpenClaw bridge | Plugin opcional | Ver docs bridge | Media | Auth gate Memory | Local URL | Orquestación propia | Delegate opcional | Medio | **postpone** URL real | `DisabledOpenClawBridge` default; ADR-006 |
| OpenHands / OpenDevin | `All-Hands-AI/OpenHands` | MIT | Alta | Sandbox; supply chain | Docker heavy | **Alta** vs Cursor+orch | Multi-agent coding | Alto | **reject** | Duplica Cursor + OrchestratorDaemon |
| Aider | `paul-gauthier/aider` | Apache-2.0 | Alta | Git-centric | CLI | Alta vs Composer | Edit loop | Medio | **reject** | Patrón ya cubierto en IDE |
| Autogen / CrewAI / LangGraph multi-agent | Microsoft / CrewAI / LangChain | MIT/Apache | Alta | Prompt injection surface | Python stack | **Muy alta** | Orquestación agents | Alto | **reject** | Unified Registry + workflows + daemon |
| MetaGPT / ChatDev | Varios | MIT variada | Media | Opaca | Research | Alta | Sim org chart | Alto | **reject** | Hierarchy ADR-027 propia |
| Continue.dev | `continuedev/continue` | Apache-2.0 | Alta | IDE plugin | VS Code | Alta vs Cursor | Coding assistant | Medio | **postpone** | Ya en Cursor |
| n8n | `n8n-io/n8n` | Sustainable Use | Alta | Self-host | Docker | Parcial vs SaasWorkflow | Automations tenant | Medio | **postpone** | Ver MASTER_OPEN_SOURCE; no bloquea workforce |
| Temporal | `temporalio/temporal` | MIT | Alta | Ops complexity | Heavy | Parcial vs orch persist | Durable workflows | Alto | **postpone** | File persist Bloque C suficiente hoy |
| Trivy / Gitleaks | Aqua / Gitleaks | Apache-2.0 / MIT | Alta | Security scanning | CI | — | Supply chain | Bajo | **integrate** (ya) | Labs + security-gates |
| Vitest / Playwright | Vite / MS | MIT / Apache | Alta | Test isolation | apps/web | — | Evidence gates | Bajo | **integrate** (ya) | Workforce + elite tests |

---

## Resumen de decisiones

| Decisión | Qué |
|---------|-----|
| **integrate (ya)** | Cursor + rules vivientes, daemon/orchestrator, MCP productivo, Ollama, pgvector, Trivy/Gitleaks, Vitest/Playwright |
| **adapt** | Jerarquía de Cursor rules; patrones MCP FS/Git/Playwright sin duplicar runners |
| **postpone** | MCPs GitHub/Postgres/Docker (y paid), OpenClaw URL, n8n/Temporal, Continue |
| **reject** | OpenHands, Aider, Autogen/CrewAI/LangGraph-as-workforce, MetaGPT/ChatDev — **duplican** Cursor + Unified Registry + OrchestratorDaemon |

---

## No claims

- Esta auditoría **no** declara stack “world-class” ni certifica workforce.
- Preferir evidencia en repo (`docs/MASTER_OPEN_SOURCE_*`, soak JSON) sobre marketing de terceros.
