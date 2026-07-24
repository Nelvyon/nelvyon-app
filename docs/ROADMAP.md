# ROADMAP — NELVYON

> Historial preservado. Estados: ✅ completado · 🟡 en progreso/parcial · ❌ pendiente

---

## FASE 1 — Infraestructura y producto SaaS/OS

| Ítem | Estado | Notas |
|------|--------|-------|
| Monorepo pnpm + workspaces | ✅ | |
| Next.js 15 apps/web producción | ✅ | |
| FastAPI backend Python | ✅ | Puerto 8000 |
| Postgres + migraciones SQL | ✅ | Última repo: **518** (`518_workflows_list_columns.sql`) · SSOT SQL+ADR-039 · 517/518 prod verified |
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
| CI GitHub Actions (gates, smokes) | ✅ | portal-packs PASS · pack E2E SKIP_IA_OFF (ADR-040) |
| Supabase + RLS service_role | 🟡 | Migración 280; apply prod |
| Cloudflare DNS/WAF | ✅ | `app.nelvyon.com` verified · cert VALID · health 200 (2026-07-22) |
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
| Auditoría equipo OS (4 universos) | ✅ | `docs/OS_AGENT_TEAM_AUDIT.md` 2026-07-22 · honesty portal/beta/mock |
| OS premium dual-path Ollama | ✅ | ADR-034 · LlmClient Ollama-first · OpenAI opt-in |
| Agencia OS capability registry | ✅ | **14** servicios · playbooks · sector legacy |
| Partners CEO payout gate | ✅ | `NELVYON_CEO_PARTNER_PAYOUTS` default OFF |
| Runbook ops sin Cursor | ✅ | `OS_AUTONOMOUS_OPERATIONS.md` |
| Quality routing 3b/8b packs | ✅ | ADR-036 opt-in · Router cert intacto |
| Local AI runtime mesh | ✅ | MESH_JOIN_OK · Pack E2E growth ALL_PASS |
| Beta packs → available | ✅ | 5 packs E2E ALL_PASS · ADR-050 · catalog available |
| Agencia OS unificada élite (ops) | ✅ | ADR-055 E2E PASS staging runtime · ADR-056 P0/P1 audit fixes local · tip TBA (base `6364c28c`) |
| Redes sociales integral por cliente | ✅ | ADR-052/054 |
| Auditor independiente staging | ✅ | 13 packs E2E + session PASS/REJECT/repair |
| OpenClaw staging_mock | 🟡 | ADR-055 deepened · prod canary doc PENDING_CEO |
| OS Catalog v1.2.0 | ✅ | deploy staging `e514bbd7` · automations/reputation/SM-MCP synthetic IMPLEMENTED_VERIFIED |
| Automations/reputation OS packs | ✅ | E2E ALL_PASS · 6 entregables/pack · auto-approve · evidencia `automations_reputation_e2e_latest.md` |
| SM/MCP synthetic staging harness | ✅ | flags ON staging · productivo 0 · harness unit tests PASS · smoke Windows fix |
| Visual élite strategy_only | ✅ | creative_direction + decision matrix · spend OFF |
| Social oficial NELVYON | 🟡 | PREPARED_OFF · NelvyonOfficialSocialOps · checklist CEO |
| Legal campañas + Pepito dossier | 🟡 | gate reforzado · claimReadyLegal hard-false · LEGAL BLOCKED · ADR-056 P0 campaign launch block |
| ADR-056 elite absolute audit | ✅ | P0/P1 fixes · tip TBA · NOT READY |
| **ADR-057 Blocks 11–25 (internal cores)** | ✅ | telephony · influencers · ads · publish · mass-send · OAuth · marketplace · mobile · PWA · i18n · HA/DR · observability · legacy · private RAG · AI canary PREP · catalog **v1.4.0** · agency **249 PASS** · tsc **0** · tip TBA · NOT READY |
| Block 11 telephony_core | ✅ | simulator IMPLEMENTED_VERIFIED · real calls BLOCKED_EXTERNAL |
| Block 12 influencers_pr | 🟡 | PREPARED_OFF/beta · unit+kickoff wired · staging E2E opcional |
| Block 13 ads_attribution_core | ✅ | core IMPLEMENTED_VERIFIED · spend/OAuth BLOCKED_EXTERNAL |
| Block 14 community_publish_core | ✅ | simulator IMPLEMENTED_VERIFIED · publish BLOCKED_EXTERNAL |
| Block 15 mass-send technical | ✅ | controls IMPLEMENTED_VERIFIED · send BLOCKED_LEGAL |
| Block 16 oauth_multitenant | ✅ | framework+mock IMPLEMENTED_VERIFIED · real apps BLOCKED_EXTERNAL |
| Block 17 integrations_marketplace | ✅ | internal ping IMPLEMENTED_VERIFIED |
| Block 18 mobile Capacitor | 🟡 | PREPARED_OFF · contract VERIFIED · stores BLOCKED_EXTERNAL |
| Block 19 PWA | ✅ | Chrome/Windows verified · iOS Safari PARTIAL |
| Block 20 localization | ✅ | es/en verified · fr/de/it/pt PARTIAL |
| Block 21 HA/DR | ✅ | runbook+checks · multi-region BLOCKED_EXTERNAL |
| Block 22 observability | ✅ | local core · paid vendors PREPARED_OFF |
| Block 23 legacy consolidation | ✅ | audit+plan · zero unsafe deletes |
| Block 24 private_vector_rag | ✅ | synthetic IMPLEMENTED_VERIFIED (27 tests) · pgvector PREPARED_OFF |
| Block 25 private_ai_canary_prep | 🟡 | PREPARED_OFF · BLOCKED_CEO |

---

## Fases futuras (no iniciadas)

- Fase 3: escala multi-región, partner wholesale completo
- Fase 4: agentes autónomos en producción con aprobación humana

Ver playbooks en `docs/autonomous/`, `docs/agency-playbooks/`.
