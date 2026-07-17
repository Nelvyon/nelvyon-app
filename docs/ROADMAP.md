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
| Documentación viva (`docs/HANDOVER`) | ✅ | 2026-07-10 P3/P4 |
| Migraciones 494–511 en producción | ✅ | Aplicadas 2026-07-09 |
| P0–P2 validación regresión | ✅ | 2026-07-10 |
| P3 consolidación rendimiento/deuda | ✅ | optimizePackageImports, overrides, audit script |
| P4 hardening seguridad | ✅ | security-gates, Dependabot, Gitleaks, backup fail-fast |
| Auditoría final Fase 1 (local) | ✅ | `run-phase1-audit.mjs` + build |
| CEO activaciones externas Fase 1 | 🟡 | `docs/CEO_FINAL_ACTIONS.md` |
| n8n self-hosted | ❌ | Solo blueprint JSON |
| PC dev estandarizado | 🟡 | README-dev-Windows actualizado |

---

## FASE 2 — IA y Agentes

> Base repo cohesiva. **Elite Real: CONDITIONAL PASS** (2026-07-17). `PHASE2_ELITE_CERTIFIED=false`.

| Ítem | Estado | Notas |
|------|--------|-------|
| Especialización local certificada | ✅ | Intacta (freeze) |
| Model Router certificado + SaaS | ✅ | Intacta (freeze) |
| MCP Productivo | ✅ | SSOT; legacy deprecated |
| Shared Memory | ✅ | + content security elite |
| OpenClaw | 🟡 | Mock sandbox cert ✅ · URL real ops |
| Orquestador | 🟡 | Sandbox executor real · LIVE LLM pendiente |
| Panel + Metrics | ✅ | Elite status cards |
| RAG unificado | 🟡 | Facade ✅ · corpus eval / ILIKE deprecación ops |
| Prompt / Agent Registry | ✅ | Seed 17 + matrix |
| Elite workflows + eval suite | ✅ | Sandbox 10/10 + live 3/3 Ollama |
| `PHASE2_ELITE_CERTIFIED` | ✅ | PASS repo 2026-07-17 · residuales ops/Docker documentados |
| RAG enterprise (synthetic) | ✅ | Hybrid in-memory + Ollama embeds P/R=1 · pgvector path residual |
| Improvement loop | ✅ | propose/eval/promote/rollback · CI gate |
| OpenClaw | 🟡 | Mock sandbox cert ✅ · URL real ops |

---

## Fases futuras (no iniciadas)

- Fase 3: escala multi-región, partner wholesale completo
- Fase 4: agentes autónomos en producción con aprobación humana

Ver playbooks en `docs/autonomous/`, `docs/agency-playbooks/`.
