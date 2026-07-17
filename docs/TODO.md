# TODO — NELVYON

> Actualizado: **2026-07-10** (P3/P4 completadas; Fase 1 técnicamente cerrada)

---

## P0 — Bloqueantes producción

- [x] Completado y validado 2026-07-10

---

## P1 — Estabilidad y CI

- [x] Completado y validado 2026-07-10

---

> Actualizado: **2026-07-10** — auditoría cierre Fase 1

---

## P2 — Operación enterprise

- [x] Completado
- [x] CEO: `DATABASE_URL` secret GitHub (2026-07-10)
- [x] CEO: `PRODUCTION_BASE_URL` variable (2026-07-10)
- [ ] CEO: primer run workflow `Database Backup`
- [ ] CEO: SNS SES + dominio SES verificado (KI-011, KI-013, KI-014)

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

## Fase 2 — IA privada 100% local (2026-07-11)

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
- [ ] Portar splitter mig 507 a migrate-pg / Railway-only doc
- [x] Drop/archive tabla `scored_leads` (KI-015) — mig `513_drop_scored_leads.sql`; clase `LeadScoringService` eliminada
- [x] Fase 2 Elite sandbox — memory security · orch executor · 10 workflows · eval suite · OpenClaw mock · gate script (`PHASE2_ELITE_CERT.md`)
- [x] `PHASE2_ELITE_CERTIFIED` PASS (repo) — live Ollama E2E + RAG hybrid embeds · residual Docker/pgvector + ops 514
- [x] RAG: corpus sintético indexado (in-memory hybrid) + métricas P/R · pgvector compare cuando Docker up
- [x] Ciclo mejora controlada (propose/eval/promote/rollback) + gate CI
- [ ] Post-E2E: unificar Ollama/RAG path pgvector cuando Docker disponible (KI-016)
- [ ] CEO: SES + SNS + backup restore drill
- [ ] Declarar **NELVYON OS Y SAAS COMPLETADOS** — solo tras criterios verdes
