# TODO — NELVYON

> Actualizado: **2026-07-25** — TOTAL QUALITY · tip **`5a36809c`** · ERP reval **ALL_PASS** · prod 519/520 **applied** · CEO ack pending · `claimReady: false` · **NOT READY**

---

## P0 — Bloqueantes producción

- [x] Completado y validado 2026-07-10

---

## P1 — Estabilidad y CI

- [x] Completado y validado 2026-07-10

---

> Actualizado: **2026-07-10** — auditoría cierre Fase 1

---

> Actualizado: **2026-07-25** — TOTAL QUALITY · tip **`5a36809c`** · ERP reval **ALL_PASS** · prod 519/520 **applied** (auto-deploy) · CEO ack pending · **NOT READY**

---

## P2 — Post-auditoría / ops (cierre interno 2026-07-25 + ADR-060/061)

- [x] Staging tip **`9e931f08`** · deploy **`794662d7` SUCCESS** · `AUTONOMOUS_ALLOW_OPENAI=0` · `_migrations` **519+520**
- [x] Catalog **v1.6.0** — `ads_attribution_core` + `community_publish_core` **VERIFIED** (core/sim) · OAuth/spend/publish **BLOCKED_EXTERNAL**
- [x] Catalog **v1.7.0** — ERP Blocks 26–29+35 **IMPLEMENTED_VERIFIED** · API/UI `/saas/erp/*` · evidence `erp.cores_synthetic_latest.md` ALL_PASS
- [x] influencers_pr **VERIFIED** · telephony/oauth mock/marketplace **VERIFIED**
- [x] private_vector_rag Docker **VERIFIED** · Railway **PREPARED_OFF**
- [x] private_ai_canary **PREPARED_OFF** + **BLOCKED_CEO**
- [x] Localization UI **FULL** · email/PDF **PARTIAL** (honest)
- [x] PWA Chrome **VERIFIED** · iOS **BLOCKED**
- [x] Mobile Android scaffold present · APK **BLOCKED_EXTERNAL**
- [x] HA single-region **VERIFIED** · multi-region **BLOCKED_EXTERNAL/COST**
- [x] Observability local **VERIFIED** · legacy audit **VERIFIED** (zero deletes)
- [x] **Block 26:** `PurchasesSuppliersCore` · payments `BLOCKED_SCOPE` · **wired** catalog v1.7.0 + API/UI
- [x] **Block 27:** `InventoryWarehousesCore` · no cost/GL · **wired** catalog v1.7.0 + API/UI
- [x] **Block 28:** `ManufacturingOpsCore` · IoT `BLOCKED_EXTERNAL` · **wired** catalog v1.7.0 + API/UI
- [x] **Block 29:** `ProjectsFieldServiceCore` · signature `BLOCKED_EXTERNAL` · **wired** catalog v1.7.0 + API/UI
- [x] **Block 35:** `SectorCapabilityTaxonomy` · industry PREPARED_OFF · health BLOCKED_LEGAL · **wired** catalog v1.7.0 + API/UI
- [x] **Wire ERP 26–29+35:** OsCatalogV1 **v1.7.0** · `/api/saas/erp/*` · `/saas/erp/*` · smoke `staging-smoke-erp-cores.mjs` · migration **519** reserved
- [x] **ERP snapshot layer (local):** export/import on 4 cores · `ErpDomainSnapshotStore` · `ErpPersistentRuntime` · mig **520** · vitest PASS
- [x] **ADR-061 ERP API → `with*Persistence`:** purchases/inventory/manufacturing/projects-fs · Postgres SSOT when `DATABASE_URL` · process-memory **not** SSOT · 409 on version conflict · smoke script ready
- [x] **P0 memory risk closed (staging VERIFIED):** restart/redeploy survival **ALL_PASS** · tip **`9e931f08`**
- [x] **Ops:** staging restart smoke `--phase=before|after` → `erp.persistence_restart_latest.md` **ALL_PASS**
- [x] Staging tip **`5a36809c`** · deploy **`5965c32b` SUCCESS** · HTTP A/B + concurrency **ALL_PASS** · reval TOTAL QUALITY **ALL_PASS**
- [ ] **Daniel/CEO:** formal ack ERP schema prod + auto-deploy policy (`ERP_PROD_MIGRATE_519_520_RUNBOOK.md`)
- [x] **Opcional HTTP A/B:** **DONE** `erp.http_ab_isolation_latest.md`
- [ ] **ERP dual-write relational companions (ADR-062):** **PREPARED_OFF**
- [ ] **2ª réplica staging concurrency:** **PREPARED_OFF** (coste Railway — CEO)
- [ ] **P2 (no bloqueante):** RAG minScore corpus-size floor — `docs/KNOWN_ISSUES.md`
- [ ] **CEO (opcional):** Railway pgvector + mesh Ollama staging — `CEO_IA_STAGING_APPROVAL_REQUEST.md`
- [ ] **CEO:** telefonía — `TELEPHONY_PROVIDER_CEO_CHECKLIST.md`
- [ ] **CEO:** OAuth apps — `OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md`
- [ ] **CEO:** ads OAuth/spend — `ADS_OAUTH_SPEND_CEO_CHECKLIST.md`
- [ ] **CEO:** social publish — `SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md`
- [ ] **CEO:** mobile stores — `MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md`
- [ ] **Ops (Daniel):** Android Studio/SDK → `assembleDebug` APK + install smoke (`mobile.android_scaffold.md`)
- [ ] **P2 i18n email/PDF PARTIAL:** SES catalog restante + `backend/billing/*EmailTemplates.ts` + PDF badges; never FULL_VERIFIED without audit
- [ ] **Legal:** Pepito dossier + licencia — `DATOS_PEPITO_LICENSE_DOSSIER.md`
- [ ] **CEO:** IA prod canary — `CEO_IA_PROD_CANARY_REQUEST.md`
- [ ] No READY · no flags productivos en prod · `claimReady: false`

---

## P2 — Post-auditoría / ops (histórico ADR-055/056)

- [ ] CEO: legal checklist campañas firmada + dossier Pepito escrito (bloquea claimReady)
- [x] Mesh staging · Pack E2E ALL_PASS · ADR-044–046
- [x] `OS_UNIVERSAL_SERVICE_CATALOG.md` + `FREE_TOOLS_EVALUATION.md` · ADR-047
- [x] Fase A: Pack E2E mesh `ecommerce-growth` → ALL_PASS
- [x] Fase A: Pack E2E mesh `saas-b2b-growth` → ALL_PASS
- [x] Auditoría betas: **permanecen BETA** (no promote)
- [x] Strategy/Funnel/Retention: código + flags + contratos (ADR-049) · E2E post-deploy
- [x] E2E mesh Strategy/Funnel/Retention → ALL_PASS → IMPLEMENTED_VERIFIED
- [x] ADR-048: REJECT/DEFER Matomo/Umami (0 installs)
- [x] Certificar 5 packs (social/content/cro/analytics/brand) → ALL_PASS → available
- [x] ADR-051: equipos profesionales + QA élite + OpenClaw/Visual OFF
- [x] ADR-052: redes sociales integral + staging E2E `--only=social` ALL_PASS → IMPLEMENTED_VERIFIED
- [x] ADR-053: auditor staging + OpenClaw staging_mock + OS Catalog v1 · closure smoke ALL_PASS
- [x] ADR-054: 11 packs+auditor ALL_PASS · visual strategy_only · social oficial checklist · legal técnico · catalog 1.1
- [x] CEO closure pack: Visual élite (NO spend) + Social oficial NELVYON (prep) + Legal gate campañas + Catalog v1.1.0 + OpenClaw teamAssignments — vitest 43/43 PASS
- [x] ADR-055 local: automations/reputation packs wired beta · catalog 1.2.0 · NelvyonOfficialSocialOps · SM/MCP synthetic harness · legal Pepito dossier · OpenClaw canary doc · agency 64+ PASS · tsc 0
- [x] ADR-055 deploy staging `ideal-victory` · tip `53149384` · deploy `e514bbd7` SUCCESS
- [x] ADR-056 elite absolute audit: P0 campaign launch block (`getCampaignLaunchBlockReason`) · P1 chat/ai-copy `isOpenAiSpendAllowed` · mcp.write honesty · shared-memory scopes split · meta-ads-pack beta OAuth OFF · agency **109 PASS** · tsc **0** · eslint changed routes **0** · prod flag read ABSENT · fixes **uncommitted** (tip TBA)
- [x] Ops: staging flags `NELVYON_SHARED_MEMORY_STAGING=1` + `NELVYON_MCP_STAGING_SYNTHETIC=1` (productivo SM/MCP **0**)
- [x] Ops: E2E staging `automations-ops-pack` + `reputation-ops-pack` → **ALL_PASS** · evidencia `automations_reputation_e2e_latest.md`
- [x] ADR-057: `PrivateVectorRagCore` (Block 24) — sintético in-process **IMPLEMENTED_VERIFIED** (43 tests) · pgvector productivo **PREPARED_OFF**
- [x] ADR-057: `PrivateAiCanaryPrep` (Block 25) — checklist 12 ítems + `isProductionCanaryAuthorized()` hardcoded false · `CEO_IA_PROD_CANARY_REQUEST.md` PENDING_CEO
- [x] Block 27: `InventoryWarehousesCore` — in-memory multi-tenant inventory/warehouses/traceability VERIFIED · playbook `SERVICE_INVENTORY_WAREHOUSES.md` · later wired catalog v1.7.0
- [x] Block 28: `ManufacturingOpsCore` — in-memory multi-tenant BOM/MO/QC/maintenance/PLM · IoT `BLOCKED_EXTERNAL` · vitest 11/11 · later wired catalog v1.7.0
- [x] Block 28 follow-up: catalog registration — **done** in ADR-060 / OsCatalogV1 **v1.7.0** (IoT remains BLOCKED_EXTERNAL)
- [x] Block 18: `MobileSecureSession` + `MobileAppContract` — tenant isolation + offline queue tested; App/Play Store publish honestly `BLOCKED_EXTERNAL` (no Apple paid account, no Play budget) · `MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md`
- [x] Block 19: `PwaCertification` + `scripts/pwa-certify.mjs` · fixed real gap `manifest-saas.json` (8 non-existent PNG icon paths → existing `icon-base.svg`)
- [x] Block 20: `LocalizationCore` — es/en `FULL_VERIFIED`, fr/de/it/pt honestly `PARTIAL_NOT_AUDITED`
- [x] Block 21: `docs/ops/HA_DR_SCALE_RUNBOOK.md` + `HaDrReadiness` — RPO/RTO, multi-region `BLOCKED_EXTERNAL`
- [x] Block 22: `OpsObservabilityCore` + `docs/ops/INCIDENT_RUNBOOK.md` — correlation ids/metrics/health snapshot, no paid vendor
- [x] Block 23: `docs/ops/LEGACY_CONSOLIDATION_PLAN.md` + `LegacyConsolidationAudit` — frontend/alembic/pages-api audited, zero deletes
- [x] Ops: `pnpm -C apps/web exec vitest run backend/agency` para Blocks 18–23 → **27 files / 249 tests PASS** (confirmado en sesión Blocks 12–15) · `tsc --noEmit` **0**
- [x] Ops: `node scripts/pwa-certify.mjs` → evidencia `pwa.cert_latest.md` **PASS**
- [x] Block 12: pack `influencers-pr-pack` (research matching, scoring, brief outreach, contrato/checklist, metrics plan, informe) — `outreach_authorized` hardcoded false, no es red de influencers real; catalog `influencers_pr` **IMPLEMENTED_VERIFIED (v1.5.0)**; smoke `staging-smoke-influencers-pr-e2e.mjs` (ALL_PASS tip e81b5034) · playbook `SERVICE_INFLUENCERS_PR.md`
- [x] Block 13: `AdsAttributionCore` — campaign draft/audiencias/UTM/conversion events sintéticos, budget cap hard-fail, conectores Google/Meta/LinkedIn Ads fail-closed (`BLOCKED_EXTERNAL`/`SPEND_DISABLED`), `NELVYON_ADS_SPEND_ENABLED` default 0 · `ADS_OAUTH_SPEND_CEO_CHECKLIST.md`; catalog `ads_attribution_core` **IMPLEMENTED_VERIFIED (v1.6.0 core)** · OAuth/spend **BLOCKED_EXTERNAL**
- [x] Block 14: `CommunityPublishCore` — inbox/calendario/approval/variantes/cola/moderación/auditoría; `SimulatorPublishProvider` only, `assertPublishDisabled()` bloquea salvo oauth+CEO · `SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md`; catalog `community_publish_core` **IMPLEMENTED_VERIFIED (v1.6.0 simulator)** · publish real **BLOCKED_EXTERNAL**
- [x] Block 15: `MassSendTechnicalControls` (suppression/unsubscribe proof/rate limit/warming/reputation sintética/template audit) wired como campos informativos en `CampaignsLegalTechnicalGate` sin alterar `technicalComplete`/`sendAuthorized`; `claimReadyLegal` sigue false · `CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md` actualizado
- [x] Ops: redeploy ADR-058 → `NELVYON_INFLUENCERS_PR_PACK=1` + `staging-smoke-influencers-pr-e2e.mjs` ALL_PASS → promover `influencers_pr` IMPLEMENTED_VERIFIED
- [x] Ops: flag `NELVYON_INFLUENCERS_PR_PACK=1` en staging (seteado) · E2E pre-ADR-058 FALLÓ QA30 · fix local listo
- [ ] CEO: abrir/conectar 8 cuentas sociales oficiales NELVYON (`docs/ops/NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md`)
- [ ] Legal: dossier Pepito + licencia comercial escrita (`DATOS_PEPITO_LICENSE_DOSSIER.md` + `CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md`) — bloquea claimReady
- [ ] CEO: OpenClaw **prod canary** (`CEO_OPENCLAW_PROD_CANARY_REQUEST.md` PENDING_CEO) / SM productiva / visual paid (nueva autorización)
- [ ] CEO: Private AI **prod canary** (`CEO_IA_PROD_CANARY_REQUEST.md` PENDING_CEO) — distinto del staging ya aprobado
- [ ] Ops: levantar Docker local-ai + re-verificar `LocalVectorStore.hybridSearch` en vivo para promover Private RAG productivo de PREPARED_OFF a IMPLEMENTED_VERIFIED
- [ ] CEO: autorización OpenClaw live (hoy BLOCKED_CEO) si se requiere
- [ ] CEO: `docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md` (cuenta Twilio, números, A2P, consentimiento legal) antes de un proveedor de telefonía real — hoy `telephony_core` es simulador únicamente, real **BLOCKED_EXTERNAL** por diseño (Block 11)
- [ ] CEO: `docs/ops/OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md` (apps Google/Meta/LinkedIn/Twilio, redirect URI, `ENCRYPTION_KEY` real) antes de sustituir proveedores mock del `OAuthMultiTenantFramework` por reales (Block 16)
- [ ] No activar IA/mesh/OpenAI/MCP/SM/payouts/campañas/visual spend en prod

- [ ] No instalar Helio/Mautic/Twenty/n8n/Listmonk sin necesidad
- [ ] Ops: Router remoto soak mesh (opcional)
- [ ] No activar IA/mesh/OpenAI/MCP/SM/payouts en prod sin CEO

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
- [x] Staging Ollama alcanzable vía mesh Tailscale (pack E2E `f5de9c43`)
- [x] Auditoría equipo OS agentes (`docs/OS_AGENT_TEAM_AUDIT.md`) + honesty portal/beta/mock (2026-07-22)
- [x] Dual-path OS `LlmClient`→Ollama (ADR-034) + capability registry 11 servicios
- [x] Partners: facade + gate `NELVYON_CEO_PARTNER_PAYOUTS` (sin pagos auto)
- [x] Runbook `OS_AUTONOMOUS_OPERATIONS.md`
- [x] Redeploy prod post-unificación (IA flags OFF) — `4cb01795` / SHA `2b51581d`
- [x] ADR-036 quality routing 3b/8b opt-in + arch local-AI doc (no activar)
- [x] OS/ops flow audits + sector playbooks (beta no promote)
- [x] P0 pack E2E honest SKIP when `LLM_NOT_CONFIGURED` (ADR-040)
- [x] Dual-path E2E Ollama staging vía mesh (JOIN_OK · needs_review)
- [ ] Promote beta packs solo con cert+deliverables+E2E evidencia
- [x] CEO: Option A Tailscale staging autorizado y verificado

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
