# ROADMAP — NELVYON

> Historial preservado. Estados: ✅ completado · 🟡 en progreso/parcial · ❌ pendiente

---

## FASE 1 — Infraestructura y producto SaaS/OS

| Ítem | Estado | Notas |
|------|--------|-------|
| Monorepo pnpm + workspaces | ✅ | |
| Next.js 15 apps/web producción | ✅ | |
| FastAPI backend Python | ✅ | Puerto 8000 |
| Postgres + migraciones SQL (407) | ✅ | Última: 511 |
| Railway deploy + releaseCommand migrate | ✅ | `apps/web/railway.json` |
| Auth JWT SaaS cookies | ✅ | |
| SaasShellLayout 41 páginas | ✅ | Jun 2026 |
| CRM, campañas, workflows, billing | ✅ | |
| Stripe webhooks → plan tenant | ✅ | |
| AWS SES campañas | ✅ | Código; env en prod |
| Redis / job queue | 🟡 | Fallback in-memory sin REDIS_URL |
| Portal cliente BFF | ✅ | |
| OS packs (3 growth) + kickoff | ✅ | |
| CEO metrics dashboard packs | ✅ | PackReportDashboard |
| CI GitHub Actions (gates, smokes) | ✅ | `.github/workflows/` |
| Supabase + RLS service_role | 🟡 | Migración 280; apply prod |
| Cloudflare DNS/WAF | 🟡 | Docs; manual deploy day |
| Docker compose test (PG+Redis) | 🟡 | `docker-compose.test.yml` |
| Documentación viva (`docs/HANDOVER`) | ✅ | 2026-07-09 |
| Migraciones 494–511 en producción | 🟡 | Deploy 2026-07-09 con releaseCommand; SQL 494 sin confirmar |
| Push + deploy CEO brief fix | ✅ | `815e4c0f` en prod |
| n8n self-hosted | ❌ | Solo blueprint JSON |
| PC dev estandarizado | 🟡 | README-dev-Windows actualizado |

---

## FASE 2 — IA y Agentes

| Ítem | Estado | Notas |
|------|--------|-------|
| Private AI modular (`backend/private-ai/`) | 🟡 | Infra lista |
| Provider registry (OpenAI, Anthropic, Ollama, stub) | 🟡 | Default unconfigured |
| 17 agentes catálogo (`nelvyonAgentRegistry`) | 🟡 | Sin LLM runtime |
| Tenant memory (`SaasTenantMemoryService`) | 🟡 | DB migración 497 |
| RAG store (`NelvyonRagStore`) | 🟡 | Sin ingest pipeline |
| MCP server (5 tools) | 🟡 | `/api/mcp` + stdio |
| OpenClaw bridge | ❌ | Deshabilitado |
| CEO brief cron automatizado | 🟡 | Código desplegado; verificación HTTP post-deploy pendiente |
| Voice commands + brief | 🟡 | |
| Agent runs audit (492) | 🟡 | |
| Inbox agent (491) | 🟡 | |
| Autonomía tenant (496) | 🟡 | |
| Learning loop OS | 🟡 | Migraciones 468+ |
| Sector OS agents (~1999 archivos) | 🟡 | Packs por sector |
| LLM propio / Ollama producción | ❌ | |
| RAG ingest docs corpus | ❌ | |

---

## Fases futuras (no iniciadas)

- Fase 3: escala multi-región, partner wholesale completo
- Fase 4: agentes autónomos en producción con aprobación humana

Ver playbooks en `docs/autonomous/`, `docs/agency-playbooks/`.
