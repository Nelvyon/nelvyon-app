# TODO — NELVYON

> Actualizado: **2026-07-21** — Bloque 1 Docker+ingest **done**; Bloque 2 SM staging **verified**; KI-026 RLS ✅; SES/Stripe abiertos

---

## P0 — Bloqueantes producción

- [x] Completado y validado 2026-07-10

---

## P1 — Estabilidad y CI

- [x] Completado y validado 2026-07-10

---

> Actualizado: **2026-07-10** — auditoría cierre Fase 1

---

> Actualizado: **2026-07-23** — CEO canary staging Router+QR aprobado · claimReady false · mesh + legal pendientes

---

## P2 — Post-auditoría / ops

- [x] **KI-027** — Test brain · verify-all CONDITIONAL_READY
- [x] Validador post-elite **508–518** + SQL SSOT gate (`validate-sql-alembic-ssot`) · DuplicateTable guard
- [x] Automations unified **200** · JWT sync ADR-038 · mig 517/518 · `SKIP_ALEMBIC=1`
- [x] Ops: 1× web redeploy `--from-source` → `git_sha=9ca0cf29a5e5` (deploy `7d625161`)
- [ ] CEO: legal checklist campañas firmada (bloquea claimReady)
- [x] CEO: canary staging Router+QR (ADR-041) — flags ON · local Option C ALL_PASS
- [x] CEO: Mesh Option A prep (ADR-042) — Ollama Tailscale IP PASS · staging prep
- [ ] CEO: **regenerar** `TS_AUTHKEY` válida + redeploy staging hasta `MESH_JOIN_OK` (key actual invalid)
- [ ] Ops: Pack E2E staging + Router remoto tras MESH_JOIN_OK
- [x] Ops: portal-packs refresh GH — **PASS** · P0 SUCCESS `29944606938`
- [x] **KI-014 SES** — Production GRANTED + self-send (KI-R014)
- [x] Bloque 3 SaaS UUID isolation staging
- [x] **KI-028** — Stripe STARTER · price-audit **allValid=true** (KI-R028) 2026-07-22
- [x] Prod migrate 512–516 (KI-R029) + runtime headers (KI-R030)
- [x] `STAGING_QA_PASSWORD` + portal P0 smoke PASS
- [x] Local Ollama pack gate PASS + generate PASS (HTTP kickoff BLOCKED Docker/Postgres)
- [x] `STAGING_QA_PASSWORD` EXISTS + wired workflow + portal-packs **PASS** (2026-07-22)
- [x] Primer Database Backup workflow success (`29932453133`)
- [x] Cloudflare CNAME+TXT `app.nelvyon.com` → Railway (`DNS_APP_NELVYON.md`) · DNS/SSL/health **PASS** 2026-07-22
- [x] KI-020 smoke staging CSRF Origin (script + apex PASS; app Origin allowlist fix → redeploy)
- [ ] Staging Ollama alcanzable para pack E2E (opcional; **nunca** `localhost:11434` PC; **no** IA prod)
- [x] Auditoría equipo OS agentes (`docs/OS_AGENT_TEAM_AUDIT.md`) + honesty portal/beta/mock (2026-07-22)
- [x] Dual-path OS `LlmClient`→Ollama (ADR-034) + capability registry 11 servicios
- [x] Partners: facade + gate `NELVYON_CEO_PARTNER_PAYOUTS` (sin pagos auto)
- [x] Runbook `OS_AUTONOMOUS_OPERATIONS.md`
- [x] Redeploy prod post-unificación (IA flags OFF) — `4cb01795` / SHA `2b51581d`
- [x] ADR-036 quality routing 3b/8b opt-in + arch local-AI doc (no activar)
- [x] OS/ops flow audits + sector playbooks (beta no promote)
- [x] P0 pack E2E honest SKIP when `LLM_NOT_CONFIGURED` (ADR-040)
- [ ] Dual-path soak E2E Ollama en staging vía mesh privado (CEO + arch; nunca localhost PC)
- [ ] Promote beta packs solo con cert+deliverables+E2E evidencia
- [ ] CEO: aprobar Option A Tailscale (`ARCHITECTURE_LOCAL_AI_RUNTIME.md`) si se quiere IA local alcanzable

---

## P2 — Operación enterprise

- [x] Completado
- [x] CEO: `DATABASE_URL` secret GitHub (2026-07-10)
- [x] CEO: `PRODUCTION_BASE_URL` variable (2026-07-10)
- [x] CEO: primer run workflow `Database Backup` (`29932453133`)
- [x] SES production access (KI-R014)

---

## P3 — Consolidación, rendimiento y deuda técnica

- [x] Bundle: `optimizePackageImports` en `next.config.ts`
- [x] Overrides seguridad `ws`, `axios`, `vitest` → `pnpm-workspace.yaml`
- [x] Validador migraciones post-elite 508–511
- [x] Script `run-phase1-audit.mjs`
- [x] Regresión P0–P2: typecheck, lint, elite reinforce — PASS
- [x] Build producción — PASS

---

## P4 — Hardening y cierre Fase 1

- [x] Workflow `security-gates.yml` (audit critical, Gitleaks, migrations)
- [x] Dependabot semanal
- [x] Backup fail-fast si falta `DATABASE_URL` en schedule
- [x] Checklist CEO consolidado (`docs/CEO_FINAL_ACTIONS.md`)
- [x] Documentación viva actualizada
- [ ] CEO: acciones manuales §1–8 en `CEO_FINAL_ACTIONS.md`

---

## Workforce IA autónoma (2026-07-19)

### Interno (cerrado)

- [x] Bloque A — auditoría e inventario (`docs/AGENT_WORKFORCE_INVENTORY.md`, ADR-027)
- [x] Bloque B — hierarchy + lifecycle + alias deprecation + ephemeral workers + modes
- [x] Bloque C — daemon + persist checkpoint/recovery + kill switch + compose profile + tests
- [x] Bloques D–F — promotions runtime + ads evals + ~45 workflow catalog + ephemeral-only designs (ADR-028)
- [x] Bloque G — leaderboard + canary gates + panel resources
- [x] Bloque H — harness `run-workforce-cert.mjs` → **PASS** (`nelvyonAutonomousWorkforceCertified=true`, skipped=0)
- [x] Residuals — Product/DevOps/Social evals · workflow audit · OpenClaw mock · RAG isolation · soak · live Ollama/RAG · production build

### Externos P0 / P1 (abiertos — no invalidan Workforce PASS)

- [x] **P0** Docker/pgvector local-ai + Brain ingest **verified** 2026-07-20 (KI-018 local mitigado; remoto OpenClaw/514 sigue)
- [x] **P0** Desbloquear **KI-025** (`506a`+507…515) + Shared Memory verify staging — **done 2026-07-21**
- [x] **P1** **KI-026** — mig `516` RLS dual-plane + ADR-032 — **done staging 2026-07-21**
- [ ] **P0** SES production access + Stripe prod (Fase 1 email/billing)
- [ ] **P1** OpenClaw URL autorizada (opcional; mock ya certificado; bridge Disabled por defecto)
- [ ] **P0** SES production access + Stripe prod (Fase 1 email/billing)

- [x] Auditoría hardware (`docs/PHASE2_HARDWARE_AUDIT.md`)
- [x] Docker Compose Postgres+pgvector local
- [x] Migraciones `local_ai_*` + RLS tenant
- [x] LocalMemoryStore + LocalVectorStore + RagIngestPipeline
- [x] Embeddings Ollama local (sin API pago)
- [x] Backup pg_dump + AES opcional
- [x] PRIVATE_MODE allowlist (OpenClaw/MCP local OK)
- [x] Tests unitarios egress + integración Docker (8 pass, 2026-07-11)
- [x] Validación real: up/migrate/health/validate 7/7
- [x] RLS FORCE + rol app `nelvyon_local_app` (NOBYPASSRLS)
- [x] Ollama instalado + benchmark real (ver `PHASE2_BENCHMARK_RESULTS.md`)
- [x] Modelo LLM: `llama3.2:3b-instruct-q4_K_M`
- [x] Embeddings: `nomic-embed-text`
- [x] Constitución + ontología + 124 fuentes indexadas (`PHASE2_SPECIALIZATION.md`)
- [x] **Certificación especialización** 15/15 × 3/3 (`v6_cert_fixed`, 2026-07-12)
- [x] Model Router — `backend/local-ai/router/` (2026-07-14)
- [x] Benchmark router 100% + tests 24/24
- [x] Benchmark E2E executeTask — gates en verde (2026-07-14)
- [x] Recovery Ollama/Postgres/cola — 6/6 PASS (2026-07-14)
- [x] Enterprise fixes P0 — cola, cancel, circuit breaker, ExecutionLimiter (2026-07-15)
- [x] Soak router 2h FINAL — `router_soak_2026-07-15T19-09-13-073Z.json` (`passed=true`, 7201732ms, 0 errors, latencyByClass verdes)
- [x] Gate `latencyStable` por clase — instrumentación + soak PASS
- [x] **ROUTER DE MODELOS NELVYON COMPLETADO** — `router_certification_final.json` `completed=true`
- [x] NELVYON-LABS — eval 461/461 + inventario (~50 GB)
- [x] NELVYON-LABS bloque 1 Seguridad — `trivy` + `gitleaks` integrados (CI + adaptador; ADR-013)
- [x] NELVYON-LABS bloque maestro — **461/461 CERRADO** (`NELVYON_LABS_MASTER_CLOSURE.md`, ADR-014)
- [x] Knowledge harvest 138 patrones + registry 24 dominios + tests closure
- [x] Wiring Router → SaaS PrivateAi — ADR-015 · inference + router-health API · 7 tests
- [x] MCP Productivo código+tests+benchmark — ADR-016 · 23 tests · gates 100%
- [x] Programa excelencia — ADR-021 · inventario + matriz · `EXCELLENCE_PROGRAM.md`
- [x] Certificación funcional OS/SaaS — inventario estático `OS_SAAS_*.md` + JSON (**NO COMPLETADOS**)
- [x] MCP soak 2h verde — `mcp_soak_2026-07-16T19-56-30-289Z.json` (7200040 ms, fail=0)
- [x] **MCP PRODUCTIVO NELVYON COMPLETADO** — `mcp_certification_final.json` `completed=true`
- [x] E2E crítica UI_CONTRACT — Playwright 53/53 + harness vitest/typecheck (2026-07-17)
- [x] Lead scoring SSOT HTTP — legacy `/leads` 410 (ADR-023)
- [x] Infra cert Docker/Postgres(pgvector)/Redis — UP
- [x] Live multi-tenant CRM — cross-tenant=0 (19/19)
- [x] Fix colisiones mig 406 api_keys + 415 invoices
- [ ] E2E HTTP Next.js contra DB real (sin mocks `/api/saas/*`)
- [ ] Staging OS pack smokes re-run
- [x] Portar splitter mig 507 a migrate-pg (`scripts/lib/splitSqlStatements.mjs` + `scripts/validate-split-sql.mjs`) — KI-R017
- [x] Drop/archive tabla `scored_leads` (KI-015) — mig `513_drop_scored_leads.sql`; clase `LeadScoringService` eliminada
- [x] Fase 2 Elite sandbox — memory security · orch executor · 10 workflows · eval suite · OpenClaw mock · gate script (`PHASE2_ELITE_CERT.md`)
- [x] `PHASE2_ELITE_CERTIFIED` PASS (repo) — live Ollama E2E + RAG hybrid embeds · residual Docker/pgvector + ops 514
- [x] RAG: corpus sintético indexado (in-memory hybrid) + métricas P/R · pgvector compare cuando Docker up
- [x] Ciclo mejora controlada (propose/eval/promote/rollback) + gate CI
- [x] Post-E2E: ingest pgvector local cuando Docker disponible — **done** 2026-07-20 (ex KI-016)
- [x] Cutover RAG / Shared Memory schema en staging (KI-021) — **done 2026-07-21** (`verified:true`); flags OFF; residual KI-026 RLS FastAPI
- [x] Backup restore drill — `scripts/run-postgres-restore-drill.mjs` · KI-R012 · 8/8 PASS
- [ ] CEO: SNS SES production access (KI-014 only)
- [ ] Declarar **NELVYON OS Y SAAS COMPLETADOS** — solo tras criterios verdes
