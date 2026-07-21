# ROADMAP — NELVYON

> Historial preservado. Estados: ✅ completado · 🟡 en progreso/parcial · ❌ pendiente

---

## FASE 1 — Infraestructura y producto SaaS/OS

| Ítem | Estado | Notas |
|------|--------|-------|
| Monorepo pnpm + workspaces | ✅ | |
| Next.js 15 apps/web producción | ✅ | |
| FastAPI backend Python | ✅ | Puerto 8000 |
| Postgres + migraciones SQL | ✅ | Última repo: **516** (`516_fastapi_rls_repair.sql`) |
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
| CEO activaciones externas Fase 1 | 🟡 | SES ✅ 2026-07-21 · Stripe STARTER (KI-028) · Cloudflare app DNS |
| n8n self-hosted | ❌ | Solo blueprint JSON |
| PC dev estandarizado | 🟡 | README-dev-Windows actualizado |

---

## FASE 2 — IA y Agentes

> Base repo cohesiva. **Elite Real: PASS** (2026-07-17). `phase2EliteCertified=true` · residuales Docker/ops.

| Ítem | Estado | Notas |
|------|--------|-------|
| Especialización local certificada | ✅ | Intacta (freeze) |
| Model Router certificado + SaaS | ✅ | Intacta (freeze) |
| MCP Productivo | ✅ | SSOT; legacy deprecated |
| Shared Memory | ✅ | + content security elite |
| OpenClaw | 🟡 | Mock sandbox cert ✅ · URL real ops |
| Orquestador | ✅ | Sandbox + live Ollama executor |
| Panel + Metrics | ✅ | Elite status cards |
| RAG unificado | 🟡→✅ local | Facade + ingest local **verified** 2026-07-20 (1559 chunks) · cutover staging/prod aparte · KI-005 mitigado |
| OpenClaw | 🟡 | Mock ✅ · URL live ops |
| Shared Memory | 🟡 | Schema 514+515+516 **verified staging** · flag OFF · no READY |
| Local-ai Docker/pgvector | ✅ | Compose UP + preflight PASS + ingest verified (Bloque 1) |
| Prompt / Agent Registry | ✅ | Seed 17 + matrix |
| Elite workflows + eval suite | ✅ | Sandbox 10/10 + live 3/3 Ollama |
| `PHASE2_ELITE_CERTIFIED` | ✅ | PASS repo · ver `PHASE2_ELITE_CERT.md` |
| Improvement loop | ✅ | propose/eval/promote/rollback · CI gate |
| Workforce autónoma certificada | ✅ | `nelvyonAutonomousWorkforceCertified=true` · 45 workflows · daemon · live Ollama/RAG |

---

## Fases futuras (no iniciadas)

- Fase 3: escala multi-región, partner wholesale completo
- Fase 4: agentes autónomos en producción con aprobación humana

Ver playbooks en `docs/autonomous/`, `docs/agency-playbooks/`.
