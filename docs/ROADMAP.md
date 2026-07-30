# ROADMAP — NELVYON

> Historial preservado. Estados: ✅ completado · 🟡 en progreso/parcial · ❌ pendiente

---

## FASE 1 — Infraestructura y producto SaaS/OS

| Ítem | Estado | Notas |
|------|--------|-------|
| Monorepo pnpm + workspaces | ✅ | |
| Next.js 15 apps/web producción | ✅ | |
| FastAPI backend Python | ✅ | Puerto 8000 |
| Postgres + migraciones SQL | ✅ | Última repo: **522** (`522_saas_workflows_score_threshold_trigger.sql`) · 521/522 staging applied · prod **CEO gate** |
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
| CEO activaciones externas Fase 1 | 🟡 | SES ✅ · Stripe KI-R028 ✅ · OAuth/Twilio/WA/Ads → Fase 2 checklists |
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
| Agencia OS unificada élite (ops) | ✅ | ADR-055 E2E PASS staging · ADR-056–061 · tip live **`9e931f08`** · ERP Postgres SSOT VERIFIED |
| Redes sociales integral por cliente | ✅ | ADR-052/054 |
| Auditor independiente staging | ✅ | 13 packs E2E + session PASS/REJECT/repair |
| OpenClaw staging_mock | 🟡 | ADR-055 deepened · prod canary doc PENDING_CEO |
| OS Catalog v1.2.0 | ✅ | deploy staging `e514bbd7` · automations/reputation/SM-MCP synthetic IMPLEMENTED_VERIFIED |
| Automations/reputation OS packs | ✅ | E2E ALL_PASS · 6 entregables/pack · auto-approve · evidencia `automations_reputation_e2e_latest.md` |
| SM/MCP synthetic staging harness | ✅ | flags ON staging · productivo 0 · harness unit tests PASS · smoke Windows fix |
| Visual élite strategy_only | ✅ | creative_direction + decision matrix · spend OFF |
| Social oficial NELVYON | 🟡 | PREPARED_OFF · NelvyonOfficialSocialOps · checklist CEO |
| Legal campañas + Pepito dossier | 🟡 | gate reforzado · claimReadyLegal hard-false · LEGAL BLOCKED · ADR-056 P0 campaign launch block |
| ADR-056 elite absolute audit | ✅ | P0/P1 fixes · NOT READY |
| **ADR-057 Blocks 11–25 (internal cores)** | ✅ | cores internos VERIFIED · externos BLOCKED_* · **NOT READY** |
| **ADR-059 catalog v1.6.0 + i18n/mobile honesty** | ✅ | ads/community promote (core/sim) · email locale PARTIAL · Android scaffold · tip live `bd165985` |
| **ADR-060 ERP non-financial cores (catalog v1.7.0)** | ✅ | Blocks 26–29+35 **IMPLEMENTED_VERIFIED** · API/UI wired · mig **519** reserved · payments/IoT/signature/health **BLOCKED_*** · **no Odoo** · **NOT READY** |
| **ADR-061 Postgres ERP SSOT (mig 520)** | ✅ | Staging+prod tip **`c2edb2da`** · schema prod applied · reval ALL_PASS · CEO formal ack pending |
| **ADR-062 ERP relational dual-write** | ✅ | Staging **IMPLEMENTED_VERIFIED** (ADR-068) · READ=0 · prod **OFF** |
| **ADR-065 Railway Private RAG prep** | ✅ | Staging apply+e2e **IMPLEMENTED_VERIFIED** critical (ADR-068) · prod DDL **OFF** |
| **ADR-066 Puntos 1–4 prep batch** | ✅ | Prep cerrada 2026-07-26 · tip `43d7c3db` |
| **ADR-067 CEO 1 SÍ / 2–4 NO** | ✅ | Gate política **CEO-ACK** · #2–#4 supersedidos por ADR-068 · **NOT READY** |
| **ADR-068 CEO close 2–4 sin coste** | ✅ | Dual-write+RAG staging VERIFIED · canary authorized/not live (mesh) · **NOT READY** |
| **ADR-072/073 cierre técnico v3** | 🟡 | Staging 521+522 applied · workflows CERTIFIED · prod migrate **CEO** · **NOT READY** |
| **CEO master actions** | 🟡 | `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md` — solo humano |
| **TOTAL QUALITY 2026-07-25** | ✅ | Gates PASS · 0 code P0 residual · **NOT READY** (legal/CEO/external) |
| Block 11 telephony_core | ✅ | **VERIFIED** (sim) · real calls BLOCKED_EXTERNAL |
| Block 12 influencers_pr | ✅ | **VERIFIED** · outreach forbidden |
| Block 13 ads_attribution_core | ✅ | **VERIFIED** (core) · spend/OAuth BLOCKED_EXTERNAL · catalog v1.6.0 |
| Block 14 community_publish_core | ✅ | **VERIFIED** (sim) · publish BLOCKED_EXTERNAL · catalog v1.6.0 |
| Block 15 mass-send technical | ✅ | controls IMPLEMENTED_VERIFIED · send BLOCKED_LEGAL |
| Block 16 oauth_multitenant | ✅ | **VERIFIED** (mock) · real apps BLOCKED_EXTERNAL |
| Block 17 integrations_marketplace | ✅ | **VERIFIED** (internal ping) |
| Block 18 mobile Capacitor | 🟡 | scaffold present · APK BLOCKED_EXTERNAL · stores BLOCKED_EXTERNAL |
| Block 19 PWA | ✅ | Chrome VERIFIED · iOS BLOCKED |
| Block 20 localization | 🟡 | UI FULL · email transactional **LOCALIZED** (SES+billing+runtime) · PDF legal **HUMAN_REVIEW** · mass-send BLOCKED_LEGAL |
| Block 21 HA/DR | ✅ | single-region VERIFIED · multi-region BLOCKED_EXTERNAL/COST |
| Block 22 observability | ✅ | local VERIFIED · paid PREPARED_OFF |
| Block 23 legacy consolidation | ✅ | VERIFIED · zero unsafe deletes |
| Block 24 private_vector_rag | ✅ | Docker VERIFIED · Railway staging **IMPLEMENTED_VERIFIED** (ADR-068) · prod canary probe PASS · P2 minScore ADR-070 |
| Block 25 private_ai_canary_prep | 🟡 | Live window **IMPLEMENTED_VERIFIED** then **KILLED** (CEO NO extend) · reopen = SÍ · mesh was unblocked for that window |
| Block 26 purchases_suppliers_core | ✅ | **IMPLEMENTED_VERIFIED** · API `withPurchasesPersistence` · Postgres SSOT when DB · payments **BLOCKED_SCOPE** · catalog **v1.7.0** · 519 reserved |
| Block 27 inventory_warehouses_core | ✅ | **IMPLEMENTED_VERIFIED** · API `withInventoryPersistence` · no cost/GL · catalog **v1.7.0** · 519 reserved |
| Block 28 manufacturing_ops_core | ✅ | **IMPLEMENTED_VERIFIED** · API `withManufacturingPersistence` · IoT **BLOCKED_EXTERNAL** · catalog **v1.7.0** |
| Block 29 projects_field_service_core | ✅ | **IMPLEMENTED_VERIFIED** · API `withProjectsFsPersistence` · signature **BLOCKED_EXTERNAL** · catalog **v1.7.0** |
| Block 35 sector_capability_taxonomy | ✅ | **IMPLEMENTED_VERIFIED** (inventory) · industry PREPARED_OFF · health **BLOCKED_LEGAL** · catalog **v1.7.0** + `/saas/erp/sectors` · no Odoo/finance |

---

## Fases futuras (no iniciadas)

- Fase 3: escala multi-región, partner wholesale completo
- Fase 4: agentes autónomos en producción con aprobación humana

Ver playbooks en `docs/autonomous/`, `docs/agency-playbooks/`.

