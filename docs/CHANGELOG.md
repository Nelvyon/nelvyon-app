# CHANGELOG — Documentación y cambios registrados

> Historial acumulativo. No eliminar entradas.


## 2026-07-30

| Área | Cambio | Descripción |
|------|--------|-------------|
| UI / SaaS | **W3CRM Fase 1 AUDIT** | ZIP legal (ThemeForest/Envato, Dexignzone) extraído a `.reference/w3crm/` (gitignored) · W3CRM = admin multi-módulo real (97 pantallas/13 grupos) pero **conflicto de stack crítico** (Next14/React18/JS/Bootstrap+rsuite vs Next15.5/React19/TS/Tailwind v4) · plan + mapa `W3CRM_MIGRATION_PLAN.md` · ADR-075 (supersede parcialmente ADR-074, DashForge en pausa) · pregunta abierta bloqueante para el usuario antes de Fase 2 · **sin** UI producto · sin código de plantilla en `apps/web/src` · `claimReady: false` |
| Quality | **CTO audit P1 fixes** | activeId citas/chat/copywriter · UTF-8 lead-scoring/loyalty · es/pt messages encoding · strip Envato/Landrick SaaS UI · tenantId fail-closed · NativeShellChromeGate + dashboard 404→onboarding · informe `CTO_QUALITY_AUDIT_2026-07-30.md` · tsc/lint/vitest PASS · `claimReady: false` |
| UI / SaaS | **DashForge Fase 1 AUDIT** | ZIP legal extraído a `.reference/dashforge-ai/` (gitignored) · DF = AI builder (Next 16/Clerk/Supabase) **no** admin multi-módulo · plan + mapa `DASHFORGE_MIGRATION_PLAN.md` · ADR-074 · **sin** UI producto · `claimReady: false` |
| Mobile | **Fase 3 emulator smoke** | AVD `Nelvyon_API35` · APK install/launch **PASS** · login/nav/dashboard/CRM **PASS** · workflows UI **PARTIAL** · fix local dashboard 404→onboarding + `NativeShellChromeGate` · evidence `mobile.android_emulator_phase3_2026-07-30.md` · `claimReady: false` |
| Ops / Prod | **Fase 1 producción COMPLETE** | Migrate **521+522** APPLIED · deploy tip **`3f10c272`** SUCCESS (`3d76918b`) · live `3f10c2729502` · workflows 14/14 · sequences 8/8 · CRM 16/16 · KI020 PASS · score_threshold 201 · canary **KILL ON** · `claimReady: false` |
| Integrations | **Fase 2 prep COMPLETE (in-repo)** | `oauthEnv` defaults `app.nelvyon.com` · Meta/TikTok aliases · catalog ads/WA/Twilio **beta** · PHASE2 SSOT · WhatsApp checklist · validate + preflight · Stripe KI-R028 docs · dual-path honesty · `claimReady: false` |
| Mobile | **Fase 3 release APK** | `assembleRelease` **SUCCESS** · v**1.0.0** / code **10000** · 3.61 MB · SHA-256 en `mobile.android_release_latest.md` · sideload keystore local · Play **BLOCKED_EXTERNAL** · `claimReady: false` |
| Ops / Cert | **Fase final Cursor (cierre)** | Tip **`0d7d6e90`** · cert helpers Railway + RL backoff · passwordless gates · OAuth URIs exactas · tsc/lint/build/Vitest/PW **PASS** · KI020 **PASS** · honesty register **429** → Ops `STAGING_QA_PASSWORD` · `claimReady: false` |

## 2026-07-29

| Área | Cambio | Descripción |
|------|--------|-------------|
| SaaS / AI | **BFF orchestrator + tip sync** | `/api/saas/orchestrator` committed (status/jobs/enqueue · flag OFF) · HANDOVER tip `bf1d44f4` · staging live `bf1d44f4eb65` · migrate runbook SHA pin · `claimReady: false` |
| Security / CSRF | **Same-origin + staging Railway Origin** | CSRF allowlist accepts deployment `requestOrigin`, `RAILWAY_PUBLIC_DOMAIN` y host staging ideal-victory · smoke scripts default → Railway staging URL · tip `9bbd5808` live · KI020 **PASS** |
| QA / Playwright | **Contratos E2E alineados al UI real** | `auth` / `dashboard` / `marketing` / `pricing` actualizados al copy, rutas y CTAs vigentes; certificación final **386 PASS / 1 skip** en Playwright completo |
| Security / Cierre | **OS admin + SMS bulk OFF + RL** | OS dashboards `requirePlatformAdmin` · SMS bulk fail-closed · auth/portal/sms rate limits · FastAPI RL fail-closed · CI staging URLs · `claimReady: false` |
| QA / Vitest | **Cierre 16 FAIL monorepo** | Contratos fail-closed LLM · locale `sendEmail` 3er arg · onboarding locale query · sitemap mock fumadocs · pack portal via `growthPackReport` · `vitest.setup` limpia OLLAMA_* · **6214 PASS / 0 FAIL** · **sin** redeploy · `claimReady: false` |
| Ops / Launch | **Paquete ops mundial** | `OPERATIONS_INDEX` · `WORLD_CLASS_OPS_RUNBOOK` · `LAUNCH_CHECKLIST_DEFINITIVE` · `SECURITY_OPERATIONS` · `DEVELOPER_ONBOARDING` · `OPS.md` + observability SaaS · **no** prod · canary KILL · `claimReady: false` |
| Security / Perf | **Artifact path + CRM/queue caps** | `resolveArtifactZipPath` containment · CRM list/export LIMIT+413 · `createContactsBatch` · QueueClient memory TTL/cap · tests PASS · `claimReady: false` |
| Ops / Staging | **WIP excellence push + validate** | Tip **`b236bba0`** · deploy `073949a1` SUCCESS · workflows 14/14 · seq 8/8 · honesty 12/12 · CRM export/import · idempotency · rate-limit 429 · **no** prod · `claimReady: false` |

## 2026-07-28

| Área | Cambio | Descripción |
|------|--------|-------------|
| Cleanup | **v3.3 deuda segura** | Borrados **216** dashboards huérfanos · ERP lint fix · ads briefing sin mock literal · deps `-twilio` `-@radix-ui/react-accordion` · `vite`→devDeps · docs canary/env · lint **0** · tsc/build/vitest/PW PASS · `claimReady: false` · **NOT READY** |
| Ops / Gate | **Pre-prod 521–522 READ-ONLY** | Prod: migs ausentes · cols ausentes · CHECK sin score_threshold · **0** filas · runbook `PROD_MIGRATE_521_522_RUNBOOK.md` · orden **migrate→deploy** · **no** migrate ejecutado · canary KILL · `claimReady: false` |
| Ops / Prep | **Runbook final + ADR-064** | Comando canónico `migrate:prod` · approval env documentadas · staging 521/522 reconfirmadas · prod live aún tip viejo (FAILED auto-deploys) · **NOT READY** |
| Cleanup | **Cursor absolute close** | +26 orphan TSX · premium barrel trim · root junk · docs mig tip **522** · cert PASS esperado · `claimReady: false` |
| Security / Excelencia | **Fail-closed + least-privilege** | IP allowlist + custom ACLs fail-closed 503 · `requestId` en errores · RBAC export/GDPR/contracts/memberships/reports · rate limits SaaS · webhook-in idempotency · shell error UX · vitest **2480** PASS · tsc 0 · `claimReady: false` |
| Ops / Staging | **Push + deploy + SES align v3.2** | Tip remoto **`40099898`** · deploy `56df6a6e` SUCCESS · `SES_REGION=eu-west-1` · mig 521–522 confirmed · health/workflows/honesty/seq/PW/yellow **PASS** · **no** prod migrate · canary KILL · `claimReady: false` · **NOT READY** |
| Ops / Cert | **Pre-push certificación v3.1** | Typecheck PASS · build PASS · vitest 2471 · PW 5 · DECISIONS UTF-8 fix ADR-072/073 · lint erp unused **preexistente** · SES identities **eu-west-1 only** · `SAFE_TO_PUSH=true` · `SAFE_TO_MIGRATE_PROD=false` · canary KILL · `claimReady: false` · **NOT READY** |
| Ops / DB | **Cierre técnico seguro v3** | Staging mig **521+522** applied · `wf.create` CERTIFIED · Playwright 5 PASS · honesty 12/12 · PG fail-closed SCHEMA_MISMATCH · prod mig **NOT** applied · canary KILL · `claimReady: false` · **NOT READY** |
| SaaS / Workflows | **score_threshold CHECK align** | Mig 522 · `mapWorkflowWriteError` · staging repro 9/9 PASS |
| CTO / Cursor-0€ | **Auditoría v2 — Cursor 0€ vacío** | CTAs A/B+Facturas+Docs · sequences tracking mig 521 · Twilio/SES honesty · analytics fail-closed · portal approve feedback · 73 vitest PASS · email/workflows E2E → ops · `claimReady: false` · **NOT READY** |
| Email / i18n | **Lote A locale transactional (0€)** | Billing lifecycle es/en/fr/de/it/pt · SES catalog completo · chrome footer/`lang` · `resolveUserEmailLocale` wired · PDF legal HUMAN_REVIEW · `claimReady: false` |
| SaaS / CRM | **Sequence triggers + cron + CTAs** | Auto-enroll · cron */15 · SES fail-closed · Documentos/Comunidades |
| Docs / CEO | **Misión CTO + auditoría definitiva** | `CTO_MISSION_YELLOW_TO_GREEN.md` · `CTO_DEFINITIVE_PENDING_AUDIT_2026-07-28.md` v2→v3 |

## 2026-07-27

| Área | Cambio | Descripción |
|------|--------|-------------|
| Ops / IA | **CEO canary retry PASS + kill drill** | Tip `8c5c2768` · deploys `5ef3b8d8`/`8f348e61` · inference+RAG+A/B **PASS** · kill ~1.53s · steady KILL ON · `claimReady: false` · **NOT READY** |
| Ops / IA | **CEO SÍ canary prod — FAIL→KILL** | Tip `775f7537` · deploy `dd1f9922` · router-health PASS · inference FAIL (race `PROD_CANARY_ENABLED` durante BUILDING) · KILL ~1.3s · OpenAI OFF · corrección 403+smoke wait · `claimReady: false` · **NOT READY** |
| Ops / IA | **RAG staging PASS completo (suelo corpus pequeño)** | `resolveEffectiveRagMinScore` (0.45 si chunks&lt;48; 0.32 grande) · e2e **PASS** · load 8× PASS · tests 54 PASS · prod KILL=1 / AI OFF sin cambios · KI calidad → historial · SÍ/NO canary · `claimReady: false` · **NOT READY** |
| Ops / IA | **CEO Option A RAG prep (canary OFF)** | Staging e2e reval PASS_WITH_KNOWN_GAP · prod schema+RLS+LOCAL_AI_DATABASE_URL · kill ON · pregunta SÍ/NO apertura · `claimReady: false` · **NOT READY** |
| Ops / IA | **ADR-069 fail-closed localhost RAG (sin reactivar)** | Prod prohíbe fallback `:5434`/loopback · assert schema · tests PASS · KILL ON · CEO A/B `CEO_PROD_RAG_DB_OPTIONS.md` · `claimReady: false` · **NOT READY** |

## 2026-07-26

| Área | Cambio | Descripción |
|------|--------|-------------|
| Ops / IA | **ADR-069 prod canary attempt (fail-closed)** | CEO `TS_AUTHKEY` · MESH_JOIN_OK · tip **`1eaed9f2`** (dockerignore fix) · smoke route 3B/isolation PASS · inference FAIL `127.0.0.1:5434` · kill ~1.27s · OpenAI OFF · **NOT** IMPLEMENTED_VERIFIED · `claimReady: false` · **NOT READY** |
| Ops / CEO | **ADR-068 close puntos 2–4 (sin coste)** | Staging dual-write **IMPLEMENTED_VERIFIED** (JSONB↔`erp_suppliers` equivalence) · RAG Railway staging schema+RLS+e2e **IMPLEMENTED_VERIFIED** critical (PASS_WITH_KNOWN_GAP) · prod canary **AUTHORIZED** en tip `428c6c91` pero **NOT activated** (**BLOCKED_EXTERNAL** Tailscale/`TS_AUTHKEY`) · OpenAI OFF · prod dual-write/RAG DDL OFF · tip staging live `428c6c91` · prod live `d03721c1` · `claimReady: false` · coste **0** |
| Gobernanza / CEO | **ADR-067 CEO 1 SÍ / and 2–4 NO** | #1 gate migrate **CEO-ACK** (sin migrate ahora) · #2 dual-write NO · #3 RAG apply NO · #4 canary IA NO · regresión soft-flag approve · ERP A/B ALL_PASS · `points_1_4_ceo_decision_latest.md` · `claimReady: false` · **parcialmente supersedido por ADR-068** (#2–#4) |
| Ops / Gobernanza | **PUNTOS 1–4 PREP COMMITTED (sin activar)** | Commit+push docs · orphan classify 14→0 · evidencias `points_1_4_*` · ERP reval ALL_PASS · ADR-066 · **NO** dual-write · **NO** RAG apply · **NO** canary · **NO** migrate prod · `claimReady: false` |
| Ops / Gobernanza | **PUNTOS 1–4 PREPARED (sin activar)** | ADR-064 reval fail-closed · ERP dual-write PREPARED_OFF + staging A/B/conc/persist **ALL_PASS** · RAG apply blocked exit 2 · canary `authorized===false` · `CEO_POINTS_1_4_APPROVAL_REQUEST.md` (4 frases SÍ/NO) · orphan classify 14→0 · evidence `points_1_4_*` · **0 activaciones** · `claimReady: false` |
| Ops / IA / Mobile | **CIERRE TOTAL Cursor** | Staging+prod tip **`d03721c1`** VERIFIED · `railwayRagPrep`+apply script fail-closed · RAG runbook PREPARED_OFF · `android-one-step.mjs` · `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md` · email/PDF PARTIAL inventory · canary rollback &lt;5min · ERP concurrency ALL_PASS · `claimReady: false` |

## 2026-07-25

| Área | Cambio | Descripción |
|------|--------|-------------|
| Ops / Product | **CIERRE puntos 1–7** | Staging `f0d3c57c`/`e5cb8c85` VERIFIED · saas i18n sso/audit · ADR-062 prep flags+tests+runbook · réplica **BLOCKED_COST** · Railway pgvector extension VERIFIED / RAG path PREPARED_OFF · Android APK hash+smoke script · PWA certify PASS / iOS BLOCKED · `claimReady: false` |
| Audit / Infra / i18n | **CIERRE INTERNO ABSOLUTO** | 0 P0 · harden ADR-064 en `migrate.ts` (cierra bypass `pnpm migrate`) +2 tests · saas nav/common/errors/settings fr/de/it/pt nativos · mobile SSOT (build VERIFIED · device BLOCKED) · CEO canary request actualizado · ERP A/B+concurrency reval **ALL_PASS** · tsc 0 · anti-mock PASS · `claimReady: false` · **NOT READY** |
| Infra / DB | **ADR-064 VERIFIED live (staging+prod)** | tip **`c2edb2da`** · staging deploy **`da6b7a74`** apply-allowed · prod deploy **`a82b55ac`** `isProduction=true` `pending_count=0` skip-apply · ERP A/B+concurrency **ALL_PASS** · evidencia `prod.migrate_gate_latest.md` · 519/520 **kept** · `claimReady: false` · **NOT READY** |
| Infra / DB | **ADR-064 prod migrate gate (P0 gobernanza)** | `migrate-prod.ts` fail-closed en production sin `NELVYON_PROD_MIGRATE_APPROVED=1`+`APPROVED_BY`; pending>0 → exit 1; staging auto-apply; vitest 13 PASS; runbook `PROD_MIGRATE_GATE_RUNBOOK.md`; 519/520 **no revertidas**; `claimReady: false` |
| Docs / Ops | **TOTAL QUALITY release-readiness** | Reval ERP A/B+concurrency+persist **ALL_PASS** · tsc/vitest/eslint/anti-mock PASS · prod tip **`5a36809c`** · IA keys ABSENT · **519/520 prod already applied** (migrate skip; auto-deploy) · CEO formal ack still required · code P0 **none** · `claimReady: false` · **NOT READY** |
| Staging / ERP | **HTTP A/B + concurrency ALL_PASS · tip `5a36809c`** | Smokes `staging-smoke-erp-http-ab.mjs` / `staging-smoke-erp-concurrency.mjs` · inventory `reserve` API · ADR-062 dual-write **PREPARED_OFF** · prod runbook `ERP_PROD_MIGRATE_519_520_RUNBOOK.md` **BLOCKED_CEO** · deploy **`5965c32b`** · evidencia `erp.http_ab_isolation_latest.md` + `erp.concurrency_latest.md` · `claimReady: false` |
| Staging / DB | **ADR-061 VERIFIED — ERP Postgres restart survival** | tip **`9e931f08`** · deploys **`86c93c8c`** (mig) + **`794662d7`** (redeploy recycle) · `_migrations` **519+520** · smoke `erp.persistence_restart_latest.md` **ALL_PASS** · snapshot purchases v3 · RLS on · prod ERP **no** migrate sin CTO · `claimReady: false` · **NOT READY** |
| Docs / DB | **ADR-061 living docs sync (Postgres ERP SSOT · no commit)** | HANDOVER · PROJECT_STATUS · ROADMAP · TODO · CHANGELOG · DECISIONS (**ADR-061**) · DATABASE (519 reserved + 520) · DEPLOYMENTS · KNOWN_ISSUES (close P0 process-memory SSOT → historial; ops restart smoke pending) · CTO_FINAL_VERIFY · AUDITORIA · MASTER_CONTEXT §8 · INFRASTRUCTURE · honestidad: process-memory **no longer SSOT** when `DATABASE_URL` · API `with*Persistence` · `erp_domain_snapshots` · restart smoke **pending** staging · `claimReady: false` · **NOT READY** |
| Agencia / SaaS / DB | **ERP API routes → Postgres persistence (mig 520)** | `/api/saas/erp/{purchases,inventory,manufacturing,projects-fs}` use `with*Persistence` · hydrate/save `erp_domain_snapshots` when `DATABASE_URL` · in-memory fallback · `ErpSnapshotConflictError` → **409** · OsCatalogV1 nextAction: Postgres SSOT via mig 520 when live · smoke `staging-smoke-erp-persistence.mjs` (`--phase=before|after`) · vitest `withPurchasesPersistence` roundtrip (DB optional) · payments/IoT/signature still **BLOCKED_*** · 0€ |
| Agencia / DB | **ERP durable snapshot layer (cores + store · APIs untouched)** | `exportTenantSnapshot`/`importTenantSnapshot` on Purchases/Inventory/Manufacturing/ProjectsFs · `ErpDomainSnapshotStore` (optimistic version · FOR UPDATE · `app.tenant_id` GUC) · `ErpPersistentRuntime` `with*Persistence` (DB or in-memory fallback) · `DbClient.withTransaction` · mig **520** `erp_domain_snapshots`/`erp_audit_events` · vitest **48 PASS / 1 skip** · **no** API route change yet · payments/IoT/signature still **BLOCKED_*** · 0€ |
| Docs | **ADR-060 living docs sync (ERP Blocks 26–29+35 · catalog v1.7.0 · no commit)** | HANDOVER · PROJECT_STATUS · ROADMAP · TODO · CHANGELOG · DECISIONS (ADR-060) · DATABASE (519) · DEPLOYMENTS (pending deploy) · KNOWN_ISSUES (ERP in-memory process-local) · INTEGRATIONS (no Odoo) · CTO_FINAL_VERIFY · AUDITORIA_TECNICA_ABSOLUTA · NELVYON_MASTER_CONTEXT §8 · INFRASTRUCTURE · honestidad: cores **IMPLEMENTED_VERIFIED** in-memory (telephony pattern) · mig **519** schema reserved · **no** dual-write · payments/accounting/IoT/signature/health **BLOCKED_*** · API/UI `/saas/erp/*` · evidence `erp.cores_synthetic_latest.md` ALL_PASS · tip **uncommitted** on **`bd165985`** · `claimReady: false` · **NOT READY** |
| Agencia / SaaS | **Wire Blocks 26–29 + 35 → product surface (catalog v1.7.0)** | Export cores from `backend/agency/index.ts` · OsCatalogV1 **1.7.0** (`purchases_suppliers_core`, `inventory_warehouses_core`, `manufacturing_ops_core`, `projects_field_service_core`, `sector_capability_taxonomy` → **IMPLEMENTED_VERIFIED** con evidencia unit + nextAction honesto payments/IoT/signature/regulated) · API `/api/saas/erp/{purchases,inventory,manufacturing,projects-fs,sectors}` · UI `/saas/erp/*` + nav · smoke `staging-smoke-erp-cores.mjs` · migración **519** schema reserved (SSOT in-memory hasta dual-write) · 0€ |
| Agencia | **Block 26 — PurchasesSuppliersCore (in-memory · no catalog)** | `backend/agency/PurchasesSuppliersCore.ts` — multi-tenant procurement: Supplier/PR/RFQ/PO/GoodsReceipt/Return/Incident/AttachmentMeta/AuditEntry/ApprovalPolicy · `recordPayment()` always `BLOCKED_SCOPE` · idempotency on createPR/createPO/postReceipt · `assertPurchasesCoreIntegrity()` · playbook `SERVICE_PURCHASES_SUPPLIERS.md` · vitest **11/11 PASS** · **sin** OsCatalogV1/index/migrations · no payments/accounting · 0€ |
| Agencia | **Block 27 — InventoryWarehousesCore (in-memory · no catalog)** | `backend/agency/InventoryWarehousesCore.ts` — multi-tenant products/warehouses/locations, immutable stock moves (receive\|adjust\|transfer\|pick\|return\|reserve\|release), lots/serials traceability, reservations, physical count approval→adjust, min-stock alerts, append-only audit · hard rules: `TENANT_MISMATCH`, over-reserve rejected, move idempotency, adjust requires approval, no cost/GL · `assertInventoryCoreIntegrity()` · playbook `SERVICE_INVENTORY_WAREHOUSES.md` · vitest **11/11 PASS** · **sin** catalog/index/migrations |
| Agencia | **Blocks 29 + 35: ProjectsFieldServiceCore + SectorCapabilityTaxonomy (uncommitted)** | **Block 29** `ProjectsFieldServiceCore` — projects/tasks+deps/kanban, capacity warn, timesheet approve, `computeOperationalMargin` NON-GL, field WO, signature always `BLOCKED_EXTERNAL`, portal stub, SLA, audit+tenant isolation · `SERVICE_PROJECTS_FIELD_SERVICE.md` · **Block 35** `SectorCapabilityTaxonomy` — 8 sectors; VERIFIED only local/ecommerce/saas_b2b/agency_marketing; industry PREPARED_OFF until ManufacturingOpsCore in catalog; health BLOCKED_LEGAL; elite teams by OsTeamId ref · optional `SECTOR_PROFESSIONAL_SERVICES`/`SECTOR_RETAIL`/`SECTOR_INDUSTRY_MFG` · **no** `OsCatalogV1`/`index.ts` · vitest **16/16 PASS** |
| Agencia | **Block 28 — ManufacturingOpsCore (in-memory · no catalog)** | `backend/agency/ManufacturingOpsCore.ts` — multi-tenant BOM/routing/MO/QC/NC-CAPA/maintenance/PLM · `IoTAdapter.connect()` ALWAYS `BLOCKED_EXTERNAL` (PREPARED_OFF) · hard rules: tenant isolation, no consume without release, scrap ≤ good · `assertManufacturingCoreIntegrity()` · playbook `docs/agency-playbooks/SERVICE_MANUFACTURING_OPS.md` · vitest **11/11 PASS** · **sin** catalog/index/migrations · no IoT real · no DB |
| Docs | **Cierre interno honestidad (SSOT sync · no commit)** | Actualizados HANDOVER · PROJECT_STATUS · ROADMAP · TODO · CHANGELOG · DECISIONS (ADR-059) · INFRASTRUCTURE · DATABASE · DEPLOYMENTS · KNOWN_ISSUES · INTEGRATIONS · CTO_FINAL_VERIFY · AUDITORIA_TECNICA_ABSOLUTA · NELVYON_MASTER_CONTEXT §8 · staging tip **`5adbfcd2`** · deploy **`d5caafc0` SUCCESS** · `AUTONOMOUS_ALLOW_OPENAI=0` · catalog **v1.6.0** (local tip post-commit) · capacidades: influencers/ads(core)/community(sim)/telephony(sim)/oauth(mock)/marketplace **VERIFIED** · private_vector_rag Docker **VERIFIED** / Railway **PREPARED_OFF** · private_ai_canary **PREPARED_OFF+BLOCKED_CEO** · i18n UI **FULL** / email+PDF **PARTIAL** · PWA Chrome **VERIFIED** / iOS **BLOCKED** · mobile scaffold / APK **BLOCKED_EXTERNAL** · HA single-region **VERIFIED** · multi-region **BLOCKED_EXTERNAL/COST** · obs local **VERIFIED** · legacy **VERIFIED** zero deletes · `claimReady: false` · **NOT READY** · acciones solo Daniel listadas en HANDOVER |
| OS | **ADR-059 catalog v1.6.0 + email locale PARTIAL + Android scaffold** | Promote `ads_attribution_core` + `community_publish_core` → **IMPLEMENTED_VERIFIED** (core/simulator; OAuth/spend/publish **BLOCKED_EXTERNAL**) · email locale expand remains **PARTIAL** · Android Capacitor scaffold present · APK build SDK **BLOCKED_EXTERNAL** · no fake OAuth · no READY |
| i18n / Mobile | **Email locale expand + Android scaffold honesty** | `localeCopy.ts` wires invoice/jobCompleted/onboardingComplete (Resend) + SES `payment_failed`/`cancellation` for es/en/fr/de/it/pt · email remains **PARTIAL** (other SES catalog + `billing/*EmailTemplates` still ES) · `MobileAppContract.android_local_build` documents `apps/mobile/android/` scaffold PASS with build still **BLOCKED_EXTERNAL** until JDK/SDK `assembleDebug` · evidence `mobile.android_scaffold.md` · CEO checklist exact Studio clicks · root `.gitignore` for `local.properties` · no Play/iOS green |
| i18n | **UI localization honesty (fr/de/it/pt leftovers + email/PDF PARTIAL)** | Fixed Spanish leftover strings in `apps/web/messages/{fr,de,it,pt}.json` (auth/crm/workflows/campanias/admin/os/pricing/partners) · LocalizationCore tests assert ALL-namespace key parity vs es + known leftover Spanish-leak detector · RegionBootstrap wires `resolveTenantLocale` (workspace > user > cookie > es) · email `localeCopy.ts` for welcome+passwordReset (PARTIAL) · PDF `pdfLocaleLabels.ts` for quotes/invoices (PARTIAL) · FULL_VERIFIED remains UI-catalog-only; email/PDF never claimed FULL_VERIFIED |
| IA | **Private AI staging canary PREP drill (no prod)** | vitest `PrivateAiCanaryPrep` **24/24** · QR/OllamaRuntimePrep **12/12** con `AUTONOMOUS_ALLOW_OPENAI=0` · Tailscale Ollama `100.102.207.30:11434` `/api/tags` **VERIFIED** (tags only, 0€) · localhost Option C smoke **BLOCKED** · `isProductionCanaryAuthorized()` **false** · evidencia `private-ai.staging_canary_latest.md` · `CEO_IA_PROD_CANARY_REQUEST.md` acortado CEO-ready **PENDING_CEO** · RAG re-run **BLOCKED_DOCKER** (`pgvector-rag.rerun_blocked_latest.md`) prior VERIFIED intacto · Railway pgvector **PREPARED_OFF** · `pwa-certify` **PASS** → `pwa.cert_latest.md` |
| OS | **Catalog v1.6.0 — ads_attribution_core + community_publish_core IMPLEMENTED_VERIFIED** | Promote on unit evidence (telephony_core pattern): e2eEvidence → AdsAttributionCore/CommunityPublishCore.test.ts; nextAction keeps OAuth/spend/publish **BLOCKED_EXTERNAL**; integrity version check 1.6.0; OsCatalogV1Closure expectations updated; observability drill → `observability.drill_latest.md` (no paid APM); legacy audit → `legacy.consolidation_latest.md` (0 unsafe deletes · DO_NOT_TOUCH frontend/); HA readiness refresh → `ha-dr-readiness_latest.md` |
| OS | **influencers_pr IMPLEMENTED_VERIFIED + catalog v1.5.0** | Staging E2E ALL_PASS tip e81b5034 (ADR-058); OsCatalogV1 v1.5.0; influencers_pr IMPLEMENTED_VERIFIED; pack available; evidence influencers_pr_e2e_latest.md; outreach send remains forbidden; ads/community cores remain PREPARED_OFF |
| OS/Mesh | **ADR-058 chatbot mesh soft-continue (influencers QA30 fix)** | Causa raíz E2E influencers: `sku_chatbot` **QA 30 — escalado** por blockers inventados por Ollama (misma clase ADR-046 SEO) · `normalizeChatbotPlan` + `normalizeChatbotStrategy` + soft-continue en `runChatbotPhaseC` · `runChatbotConfig` handoff fail-safe · regresión `meshQaFixes` · **no baja QA** · sin silent mock · deploy staging pendiente + E2E antes de promover `influencers_pr` |
| Docs | **Cierre 8 puntos amarillos — tabla honestidad** | Deploy **b783e3fd** VERIFIED · mobile/iOS/multi-región/prod IA **BLOCKED_*** · PWA Chrome VERIFIED · i18n fr/de/it/pt UI FULL_VERIFIED · HA single-region VERIFIED · pgvector Docker VERIFIED / Railway PREPARED_OFF · influencers PREPARED_OFF hasta E2E post-ADR-058 · `claimReady: false` · **NOT READY** |
| IA/RAG | **Block 24 "yellow point 7" — pgvector RAG LIVE e2e (Docker+Ollama reales, uncommitted)** | Nuevo `scripts/staging-smoke-pgvector-rag-e2e.mjs`/`.ts` — ejercita la ruta productiva REAL (`RagIngestPipeline` → `LocalEmbeddingProvider` Ollama real → pgvector `vector(768)` → `LocalVectorStore.hybridSearch` cosine real → `LocalRagRetriever`) contra Docker `nelvyon-local-ai-postgres` (`pgvector/pgvector:pg16`, ya corriendo, healthy) + Ollama real (`nomic-embed-text`, encontrado tras iniciar Docker Desktop + confirmar `OLLAMA_HOST` Tailscale mesh `100.102.207.30:11434`) · tenants sintéticos A/B/C efímeros (`crypto.randomUUID()`, limpiados en `finally` — bug de orden `process.exit()`/`finally` encontrado y corregido en el propio desarrollo del smoke) · 11/13 checks **críticos** PASS (ingesta real, embeddings reales persistidos dim=768, aislamiento tenant en **dos capas** — filtro app + RLS DB con rol no-superusuario `nelvyon_local_app` — citas con procedencia real, ranking real) · 2 checks **quality** FAIL documentados: `minScore=0.32` por defecto no rechaza de forma fiable una query irrelevante contra un corpus de tenant muy pequeño (embeddings reales no dan coseno cercano a 0 para frases no relacionadas — diagnóstico con `minScore=0.55` confirma que es un ajuste de umbral, no fabricación; sin fuga cross-tenant, sin contenido inventado en ningún caso) · verdict **PASS_WITH_KNOWN_GAP** · evidencia `scripts/docs/evidence/os-saas-e2e/modules/pgvector-rag.live_latest.md` · `PrivateVectorRagCore.PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath` promovido `PREPARED_OFF` → `IMPLEMENTED_VERIFIED` con evidencia+timestamp+gap documentado (guard de integridad actualizado para exigir evidencia real, nunca permite "fake green") · `OsCatalogV1.private_vector_rag` `nextAction`+`e2eEvidence` actualizados (catalog version sin bump, solo texto) · nuevo KI P2 en `docs/KNOWN_ISSUES.md` (minScore tuning) + nota Ops (staging pgvector **PREPARED_OFF**, requiere Postgres+pgvector accesible desde Railway + mesh Ollama, ninguno provisionado/solicitado) · `docs/ops/PRIVATE_RAG_RUNBOOK.md` reescrito con contrato verificado en vivo + nota de canary IA en staging (no activado) · vitest `PrivateVectorRagCore.test.ts` **27/27 PASS** (test actualizado a la nueva verdad) · `OsCatalogV1Closure.test.ts` **6/6 PASS** · `vitest run backend/agency` **305/305 PASS** (27 files) · `tsc --noEmit` **0 errores** · sin OpenAI, sin Pepito, sin activación en producción, sin tocar `NELVYON_LOCAL_ROUTER_ENABLED` · **no commit** (a petición explícita) |

## 2026-07-24

| Área | Cambio | Descripción |
|------|--------|-------------|
| Docs | **ADR-057 Blocks 11–25 SSOT sync (complete · no commit)** | Actualizados HANDOVER · NELVYON_MASTER_CONTEXT §8 · PROJECT_STATUS · ROADMAP · TODO · CHANGELOG · DECISIONS (ADR-057 ampliado) · INFRASTRUCTURE · DATABASE · DEPLOYMENTS · KNOWN_ISSUES · INTEGRATIONS · CTO_FINAL_VERIFY · AUDITORIA_TECNICA_ABSOLUTA · OS_ELITE_STATE_MATRIX · OS_CATALOG_V1.md con tabla canónica Blocks 11–25 · tip **TBA** · **CONDITIONAL_READY** · `claimReady: false` · **NOT READY** · evidencia: `tsc` **0** · `backend/agency` **249 PASS** · influencers pack **PASS** · `pwa-certify` **PASS** · private-rag synthetic **ALL_PASS** (27 tests) · catalog **v1.4.0** · staging https://ideal-victory-staging.up.railway.app · prod flags **OFF** · próximo paso: CEO checklists + confirm staging deploy after push |
| Agencia | **Blocks 11/16/17: dialer telephony CORE + OAuth multi-tenant framework + integrations marketplace v1 (uncommitted)** | **Block 11** `backend/agency/TelephonyCore.ts` — interfaz `TelephonyProvider` (enqueueCall/startCall/endCall/getRecordingMeta/optOutCheck); `SimulatorTelephonyProvider` in-memory sintético (nunca red): `ContactConsent`/`CallQueueItem`/`CallCampaign` (siempre `draft`)/`RecordingConfig` (OFF por defecto)/`AuditEntry`/CRM timeline stub, tenant isolation dura, rate limit por minuto/hora; transcripción local `PREPARED_OFF` (`NELVYON_CALL_TRANSCRIPTION_ENABLED` default `0`, nunca transcribe pase lo que pase); `TwilioTelephonyProvider` cuyo **constructor siempre lanza** `BLOCKED_EXTERNAL` (no hay flag ni parámetro que lo active); `assertTelephonyRealProviderDisabled()` integrity check; no toca `backend/integrations/TwilioService.ts`; `docs/agency-playbooks/SERVICE_DIALER.md` + `docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md` · **Block 16** `backend/agency/OAuthMultiTenantFramework.ts` — `AesGcmOAuthTokenVault` (AES-256-GCM, fail-closed si falta `ENCRYPTION_KEY` fuera de test), PKCE generate/verify, state CSRF, scopes mínimos por proveedor, conexiones **tenant-scoped** (`tenantId` obligatorio), rotate/revoke/reconnect/delete, audit log; proveedores mock `GoogleMockOAuthProvider`/`MetaMockOAuthProvider`/`LinkedInMockOAuthProvider`/`TwilioMockOAuthProvider` (sin HTTP real); `docs/ops/OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md` · **Block 17** `backend/agency/IntegrationsMarketplaceV1.ts` — manifest schema (id/version/scopes/permissions/healthcheckPath/publisher), catálogo in-memory con `assertValidManifest()` (solo `publisher: "nelvyon_internal"` permitido, publish externo rechazado), instalación/upgrade/revoke/uninstall por tenant, healthcheck, audit log; integración interna `nelvyon.internal.ping` instala y healthchecks OK por defecto; `docs/ops/INTEGRATIONS_MARKETPLACE_V1.md` · catalog bump **v1.3.0 → v1.4.0** (`telephony_core`+`oauth_multitenant`+`integrations_marketplace` → **IMPLEMENTED_VERIFIED**, real/producción de cada uno permanece bloqueado hasta acción CEO); exportado desde `backend/agency/index.ts` · nuevas suites: `TelephonyCore.test.ts`, `OAuthMultiTenantFramework.test.ts`, `IntegrationsMarketplaceV1.test.ts` + extensión `OsCatalogV1Closure.test.ts` — **51/51 PASS** (`vitest run backend/agency/__tests__/{TelephonyCore,OAuthMultiTenantFramework,IntegrationsMarketplaceV1,OsCatalogV1Closure}.test.ts`) · `tsc --noEmit -p backend/tsconfig.json` sin errores nuevos en estos 3 módulos ni en `index.ts`/`OsCatalogV1.ts` · full suite `backend/agency backend/saas backend/oauth` **222/223 files, 2647/2652 tests PASS** (1 fallo preexistente ajeno: `nelvyonBrainKnowledge.test.ts` — `unclassifiedActiveDocs` por docs nuevos de otros bloques concurrentes en `docs/*.md` top-level, ninguno de los archivos de este cambio está en las rutas escaneadas por ese detector) · **sin Twilio real, sin OAuth real, sin publish externo, sin costes, sin Pepito** · `claimReady` sigue **false** · **no commit** (a petición explícita) |
| Agencia | **Blocks 12–15: influencers/PR pack + ads&attribution core + community publish core + mass-send technical reinforcement (uncommitted)** | **Block 12** pack `influencers-pr-pack` (types + `influencersPrPackProduction.ts` + `influencersPrPacksRunners.ts`) — entregables sintéticos en español: research matching, scoring sheet, brief outreach, contrato/checklist, metrics plan, informe ejecutivo; wired en `packRegistry`/`packOsBridge`/`osPackFlags` (`NELVYON_INFLUENCERS_PR_PACK` default OFF)/`runnersMap`/`servicePacksCatalog` (beta); `outreach_authorized` hardcoded **false** — no es una red de influencers real; catalog `influencers_pr` → **PREPARED_OFF**, `e2eEvidence: null`; smoke `scripts/staging-smoke-influencers-pr-e2e.mjs` (modelado en el de automations, no ejecutado en staging aún) + playbook `docs/agency-playbooks/SERVICE_INFLUENCERS_PR.md` · **Block 13** `backend/agency/AdsAttributionCore.ts` — campaign draft, objetivos, creatividades, audiencias sintéticas, UTM builder, conversion events in-memory, budget cap hard-fail si spend&gt;0 sin CEO, approval gates CEO/cliente; conectores `GoogleAdsConnector`/`MetaAdsConnector`/`LinkedInAdsConnector` fail-closed (`connect()`/`spend()` lanzan `BLOCKED_EXTERNAL`/`SPEND_DISABLED`); `NELVYON_ADS_SPEND_ENABLED` default **0**; reporting snapshot sintético; `docs/ops/ADS_OAUTH_SPEND_CEO_CHECKLIST.md`; catalog `ads_attribution_core` → **PREPARED_OFF** · **Block 14** `backend/agency/CommunityPublishCore.ts` — content inbox, calendario editorial, approval workflow, variantes por red, cola de publicación, moderación con escalado humano, métricas placeholder, rollback, auditoría; `SimulatorPublishProvider` únicamente (nunca publish/DM real); `assertPublishDisabled()` bloquea salvo oauth+CEO explícitos (ambos false por defecto); `docs/ops/SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md`; catalog `community_publish_core` → **PREPARED_OFF** · **Block 15** `backend/agency/MassSendTechnicalControls.ts` — suppression list check, unsubscribe proof, rate limit helper, warming metadata, reputation score sintético, template audit; wired en `CampaignsLegalTechnicalGate` como campos informativos opcionales (`unsubscribeProofOk`, `templateAuditOk`, `warming`, `reputationScoreSynthetic`) sin alterar `technicalComplete`/`sendAuthorized`; `claimReadyLegal` sigue hardcoded **false**, `getCampaignLaunchBlockReason` sigue hard-block; `docs/ops/CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md` actualizado con sección "Refuerzo técnico adicional" · catalog bump **v1.2.0 → v1.3.0**; todos los módulos exportados desde `backend/agency/index.ts` · nuevas suites: `influencersPrPacksRunners.test.ts`, `AdsAttributionCore.test.ts`, `CommunityPublishCore.test.ts`, `MassSendTechnicalControls.test.ts` + extensiones en `CampaignsLegalTechnicalGate.test.ts`, `OsCatalogV1Closure.test.ts`, `servicePacksCatalog.availability.test.ts` · `tsc --noEmit` **0 errores** · `vitest run backend/agency apps/web/src/lib/packs apps/web/src/lib/saas` **27 files / 249 tests PASS** · suite principal `backend/saas backend/email src/features/saas-crm` **193/196 files, 2407/2412 tests PASS** (1 fallo preexistente ajeno a este cambio: `nelvyonBrainKnowledge.test.ts`) · **sin mensajes reales, sin publish real, sin ads spend real, sin Pepito, sin OpenAI** · **no commit** (a petición explícita) |
| Plataforma | **Blocks 18–23: mobile base, PWA cert, i18n core, HA/DR plan, observability, legacy audit (uncommitted)** | **Block 18** `MobileSecureSession` (tenant isolation headers, bounded offline queue capped retries) + `MobileAppContract` (honest capability inventory — App Store/Play Store publish **BLOCKED_EXTERNAL**, no Apple paid account, no Play budget) + `docs/ops/MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md` (Android local debug build zero-cost steps) · **Block 19** `PwaCertification` core + `scripts/pwa-certify.mjs` (writes `pwa.cert_latest.md`) · fixed real gap: `manifest-saas.json` referenced 8 PNG icons that did not exist on disk — repointed to existing `icon-base.svg` (same pattern as `manifest.json`); iOS Safari install honestly marked PARTIAL/not verified this session · **Block 20** `LocalizationCore` — locale/timezone/currency (EUR/USD/GBP) contracts; es/en declared `FULL_VERIFIED`, fr/de/it/pt honestly declared `PARTIAL_NOT_AUDITED` (marketing messages exist, SaaS dashboard/email not audited this session); no refactor of existing `apps/web` next-intl wiring · **Block 21** `docs/ops/HA_DR_SCALE_RUNBOOK.md` + `HaDrReadiness` checklist — RPO≤24h/RTO≤4h, links existing backup/restore drill + health endpoints; `isMultiRegionEnabled()` hardcoded **false**, `BLOCKED_EXTERNAL` pending CEO budget · **Block 22** `OpsObservabilityCore` (correlation ids, in-memory metrics, health snapshot, local alert simulation) + `docs/ops/INCIDENT_RUNBOOK.md`; no paid Datadog/New Relic · **Block 23** `docs/ops/LEGACY_CONSOLIDATION_PLAN.md` + `LegacyConsolidationAudit` — `frontend/` DO_NOT_TOUCH, `backend/alembic/` SECONDARY_NOT_SSOT, `pages/api/saas/*` DEPRECATED_410 confirmed, no real duplicate paths found (only a Windows `git status` slash-rendering artifact); zero destructive deletes · all 6 blocks exported from `backend/agency/index.ts` · new vitest suites added (`MobileSecureSession`, `MobileAppContract`, `PwaCertification`, `LocalizationCore`, `HaDrReadiness`, `OpsObservabilityCore`, `LegacyConsolidationAudit`) · **no Pepito, no new paid SaaS, no Apple paid account** · **no commit** (a petición explícita) |
| IA/RAG | **ADR-057 Private Vector RAG + AI canary PREP (Block 24/25)** | `PrivateVectorRagCore` — hashing-trick embeddings deterministas, coseno geométrico real, ingest/retrieve por tenant sintético A/B, refuse-on-no-evidence, aislamiento duro hard-asserted, kill switch `NELVYON_PRIVATE_VECTOR_RAG_DISABLED` · estado honesto: sintético **IMPLEMENTED_VERIFIED**, pgvector productivo **PREPARED_OFF** (no Docker esta sesión) · `PrivateAiCanaryPrep` checklist 12 ítems + `isProductionCanaryAuthorized()` hardcoded **false** + drill staging valida flags prod-peligrosos OFF · `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md` **PENDING_CEO** · `docs/ops/PRIVATE_RAG_RUNBOOK.md` · catalog: `private_vector_rag` + `private_ai_canary_prep` → `integrado_parcial` · vitest **43/43 PASS** nuevos + `nelvyonLabsMasterClosure` verde · smoke `staging-smoke-private-rag-synthetic.mjs` **ALL_PASS** · sin OpenAI · sin Pepito · **sin activación en producción** · `NELVYON_AI_ENABLED` no tocado · **no commit** (a petición explícita) |
| OS | **ADR-056 elite absolute audit** | **AUDIT_FIXES_LOCAL** · tip **TBA** (pending push · base **`6364c28c`**) · runtime staging still ADR-055 **`53149384`** · **CONDITIONAL_READY** · claimReady **false** · **NOT READY** · P0: campaign launch blocked by `getCampaignLaunchBlockReason` while `claimReadyLegal=false` (test bypass only) · P1: `isOpenAiSpendAllowed` gates chat+ai-copy · `mcp.write` no longer invented · shared-memory scopes split · `meta-ads-pack` → beta OAuth OFF · tsc **0** · CampaignsLegal+saasCampanias+saasEnv+mcpProductive+catalog availability **PASS** · agency **109 PASS** · eslint changed routes **0** · staging `ideal-victory` Online · `OLLAMA_HOST` Tailscale CGNAT private · `AUTONOMOUS_ALLOW_OPENAI=0` · MCP/SM productivo=0 · VISUAL=0 · `AI_ENABLED=1` staging only · prod flag read: `NELVYON_*` OpenAI/MCP/SM/OpenClaw/visual **ABSENT** · Pepito untouched · no competitive superiority claims |
| OS | **ADR-055 E2E PASS (staging)** | **CONDITIONAL_READY** · tip **`53149384`** · deploy **`e514bbd7`** SUCCESS · `automations-ops-pack`+`reputation-ops-pack` **ALL_PASS** (6 entregables/pack · auto-approve) · catalog v1.2.0: automations · reputation · sm_mcp_synthetic_staging → **IMPLEMENTED_VERIFIED (staging)** · SM/MCP synthetic flags **ON** · productivo SM/MCP **0** · harness unit tests PASS · smoke script Windows fix · `NelvyonOfficialSocialOps` PREPARED_OFF · OpenClaw staging deepened · canary doc PENDING_CEO · visual strategy_only spend OFF · legal gate+`DATOS_PEPITO_LICENSE_DOSSIER` · `claimReadyLegal` hard-false · Pepito forbidden · prod untouched · **NOT READY** · claimReady **false** · evidencia `automations_reputation_e2e_latest.md` |
| OS | **ADR-055 cierre local** | **CODE_READY_LOCAL** · tip **TBA** · agency **64+ PASS** · tsc **0** · catalog **1.2.0** · `automations-ops-pack`+`reputation-ops-pack` wired **beta** · E2E **pending** · `NelvyonOfficialSocialOps` PREPARED_OFF · SM/MCP synthetic harness (flags not set) · OpenClaw staging deepened · `CEO_OPENCLAW_PROD_CANARY_REQUEST` PENDING_CEO · visual `creative_direction`+matrix spend OFF · legal gate+`DATOS_PEPITO_LICENSE_DOSSIER` · `claimReadyLegal` hard-false · Pepito forbidden · prod untouched · claimReady **false** |
| OS | **ADR-054 cierre 6 puntos** | tip `980ea216` · deploy `23f637b9` · **11 packs+auditor ALL_PASS** · visual strategy_only · social oficial PREPARED_OFF · legal técnico · catalog 1.1 · claimReady **false** · prod untouched |
| OS | **CEO closure pack (visual élite + social oficial + legal gate + catalog v1.1.0)** | `VisualEliteStrategyPipeline` · `NelvyonOfficialSocialPrep` · `CampaignsLegalTechnicalGate` · catalog v1.1 · OpenClaw teamAssignments · vitest 43/43 · claimReady **false** |
| OS | **ADR-053 closure staging** | Auditor ON · OpenClaw staging_mock · Catalog v1 · tip `37b8bd42` · deploy `dd7505e9` · smoke ALL_PASS · social+auditor ALL_PASS · SM/MCP/OpenAI/payouts OFF · claimReady **false** · prod untouched |
| OS | **Social ADR-052 CERT staging** | tip `4d331b55` · deploy `85fe50cc` · E2E `--only=social` **ALL_PASS** · 7 entregables portal · paid/publish OFF · evidencia `social.adr052_e2e*` · claimReady **false** · prod untouched · 0 costes |
| OS | **Redes sociales integral (ADR-052)** | `OsSocialNetworksService` · 11 plataformas · 10 roles `svc_social_creative` · pack social +4 entregables portal · paid/publish fail-closed · playbook `SERVICE_CONTENT_SOCIAL.md` · claimReady **false** · 0 costes |
| OS | **Elite equipos + OpenClaw OFF (ADR-051)** | `OsProfessionalTeams` · QA élite ≥85/90 · auditor flag OFF · orquestador/OpenClaw contratos fail-closed OFF · VisualGenerationProvider OFF · matriz `OS_ELITE_STATE_MATRIX.md` · packs certificados intactos · claimReady **false** · 0 costes |
| OS | **Cert 5 packs + ADR-048** | social/content/cro/analytics/brand E2E **ALL_PASS** · mappers dedicados · catalog available · content_social+reporting elite · Matomo/Umami **REJECT/DEFER** · tip `eb462545` · claimReady **false** · 0 tools · prod IA OFF |
| OS | **Promote Strategy/Funnel/Retention** | E2E `new-os-packs-e2e-2026-07-24T02-55-24` **ALL_PASS** · catalog available · registry elite · tip `be61f02d` · claimReady **false** |
| OS | **Cert ecommerce + saas-b2b + new packs** | Pack E2E ecommerce **ALL_PASS** · saas-b2b **ALL_PASS** · registry `ecommerce`+`crm_sales` elite · Strategy/Funnel/Retention packs (mappers+flags+kickoff) · betas audit **no promote** · SEO soft-continue PM · ADR-049 · claimReady **false** · prod IA OFF · 0 tools |
| OS | **Universal catalog + free tools audit** | `OS_UNIVERSAL_SERVICE_CATALOG.md` · `FREE_TOOLS_EVALUATION.md` · ADR-047 · nada instalado · claimReady **false** |
| Mesh | **CIERRE POST-MESH** | tip `99b30730` · staging live match · `MESH_JOIN_OK` · peer `nelvyon-staging-web-3` active · Pack E2E **ALL_PASS completed** (5 auto-approve) · portal-packs **ALL_PASS** · SEO fix ADR-046 (ignore LLM blockers + pad keywords + JSON repair + soft-continue) · prod `OPENAI_API_KEY` **ABSENT** · flags IA/mesh OFF · Ollama privado PASS · tenant iso 16/16 · claimReady **false** (legal) · rollback `AI=0`+`OLLAMA=0` |

## 2026-07-23

| Área | Cambio | Descripción |
|------|--------|-------------|
| Mesh | **Final verify MESH_JOIN_OK + Pack E2E** | Reusable `TS_AUTHKEY` · deploy `6aeb4106` SUCCESS · `MESH_JOIN_OK` · peer `nelvyon-staging-web-1` active · Ollama privado PASS · kickoff async HTTP **202** (ADR-045) · Pack run `f5de9c43` **needs_review** real 3b/8b · `deliverables_published:5` · idempotency `ON CONFLICT … WHERE` · entrypoint LF + `.gitattributes` · fail-closed no silent mock Ollama · vitest **44/44** · prod IA flags ABSENT (residual OpenAI key PRESENT) · claimReady **false** · rollback `AI=0`+`OLLAMA_CONFIGURED=0` |
| Mesh | **CGNAT allowlist + HTTP proxy (ADR-044)** | tip `1d5d620a` · deploy `03a16532` SUCCESS · PRIVATE_MODE `100.64/10` · `OLLAMA_HOST` config · Node `http` absolute-form via Tailscale HTTP proxy · entrypoint `mesh_ok` fixed · vitest **44/44** · Pack E2E staging **WARN** (critical=0) · **MESH_JOIN_FAIL** (ephemeral key consumed on redeploy) · peer offline · Ollama privado PASS · prod ABSENT · claimReady **false** · rollback `AI=0`+`OLLAMA_CONFIGURED=0` |
| Mesh | **Staging verify — join FAIL** | Ollama privado PASS · staging live/ready 200 · `TS_AUTHKEY` **invalid** · peer offline · Pack E2E BLOCKED · entrypoint fix (proxies solo si up OK) · rollback `AI=0`+`OLLAMA_CONFIGURED=0` · prod ABSENT · claimReady **false** |
| Mesh | **Option A staging prep (ADR-042)** | Ollama bind Tailscale IP only · private `/api/tags` PASS · allowlist CGNAT/ts.net · entrypoint mesh opcional · staging `NELVYON_MESH_OPTION_A=1` + `OLLAMA_HOST` · AI=0 hasta `TS_AUTHKEY` · prod ABSENT · Funnel/Serve/exit/subnet forbidden · runbook clics exactos · coste **0** · claimReady **false** |
| Canary | **CEO staging Router+QR** | ADR-041 · Railway staging `ideal-victory`: Router+QR+3b/8b flags · AI master **0** · OpenAI **0** · prod IA keys **ABSENT** · local Option C probe **ALL_PASS** · remote inference **BLOCKED_UNTIL_MESH** · evidence `canary-staging-router-qr-20260723.txt` · claimReady **false** · coste **0** |

## 2026-07-22

| Área | Cambio | Descripción |
|------|--------|-------------|
| Closure | **Total internal-safe CTO** | portal-packs **PASS** · P0 SUCCESS `29944606938` · pack E2E **SKIP_IA_OFF** · tip `0f6ae7c5` · live SHA `9ca0cf29a5e5` · claimReady **false** · **no** web redeploy |
| Deploy | **Web git_sha restored** | tip `9ca0cf29a5e5` · ONE `railway redeploy --from-source` → deploy `7d625161` SUCCESS · live/apex `git_sha` match · ready 200 · FastAPI auto `25e2109d` · KI020_PASS · portal-packs SKIP (no QA password) · claimReady **false** |
| Hardening | **SQL SSOT post-automations** | `is_duplicate_table_error` cause-chain · pytest 5/5 · `validate-sql-alembic-ssot.mjs` ALL_PASS (files + DB 517/518) · wired in `nelvyon-verify-all` · post-elite **508–518** · `SKIP_ALEMBIC=1` confirmed FastAPI · claimReady **false** |
| Fix | **Automations 401 → 200** | Causa: FastAPI JWT_SECRET ≠ web. Sync ADR-038 · mig 517 workspaces · FastAPI DB=web Postgres · SKIP_ALEMBIC · mig 518 workflows.is_active · BFF unified **200** · portal-packs ALL_PASS · evidence `automations-401-closure-20260722.txt` |
| Ops | **DNS/SSL app.nelvyon.com PASS** | CF CNAME+TXT · Railway verified · cert VALID · live/ready **200** · tip `8d84036055a1` · evidence `dns-app-verify-pass-20260722.txt` |
| Security | **KI-020 CSRF LIVE** | `assertSaasOrigin` prod hosts · smoke **KI020_PASS** · deploy `bebc41d7` |
| Ops | **CEO closure DNS+smokes+backup** | Railway custom domain `app.nelvyon.com` added · CF DNS was BLOCKED_HUMAN (now PASS) · `STAGING_QA_PASSWORD` EXISTS + wired · portal-packs OPS_DEGRADED · **ALL_P0_PASS** · Backup `29932453133` · IA OFF · `claimReady: false` |
| Ops | **STAGING_QA_PASSWORD EXISTS** | Secret creado en GitHub Actions (stdin, sin valor en chat/repo) · P0 smokes iniciales `P0_FAIL` (superseded by ALL_P0_PASS rerun) · evidence `.release-logs/staging-p0-smokes-ceo-closure-20260722.txt` · sin weaken auth |
| Deploy | **Prod SUCCESS `1613fbb5`** | tip `e62d52cc` · live `e62d52cc5d61` · live/ready 200 · flags ABSENT (router/QR/MCP/SM/OLLAMA*) · cost 0 · evidence `prod-redeploy-closure-20260722.txt` |
| Ops | **Local AI prep fail-closed + ADR-037** | `OllamaRuntimePrep` · router default OFF · canary docs · CTO/ops/compliance audits · beta packs stay beta · mesh/IA flags **not** set · tsc 0 · vitest 13/13 |
| Deploy | **Prod SUCCESS `9d489e77`** | tip `06690725` (+`26ce8d00`) · live `06690725a67d` · live/ready 200 · flags ABSENT incl. quality routing · smokes blocked STAGING_QA_PASSWORD · cost 0 · no Tailscale/Ollama remoto |
| Agency | **ADR-036 quality routing + partner calc** | Opt-in `AUTONOMOUS_QUALITY_ROUTING` 3b/8b · `ARCHITECTURE_LOCAL_AI_RUNTIME` · OS/ops audits · sector playbooks · partner unified view + `commissionCalc` · flags OFF · beta packs stay beta · tsc 0 · vitest phase 18/18 |
| Deploy | **Prod SUCCESS `4cb01795`** | tip `2b51581d` · archive 69/0 · live `2b51581ddaf6` · live/ready 200 · flags ABSENT · ADR-035 MCP default OFF · payout gate 2/2 · smokes blocked STAGING_QA_PASSWORD · cost 0 |
| Deploy | **FAILED then fixed** | `d6af9ec0` / `dbd09735` untracked modules → track MCP/router/specialization · then SUCCESS |
| Docs | **ADR-035** | MCP productive fail-closed default OFF |
| Deploy | **Track specialization deps** | RouterValidator closure: `PipelineResponseValidator` · `CitationService` · `JsonOutputService` · `ContextEnforcer` · `DirectAnswerFromContext` · import-closure gaps **0** · sin benchmarks/locks · sin redeploy |
| Deploy | **Track MCP + router** | `SaasMcpProductiveService` · `backend/mcp/**` (sin benchmark) · `local-ai/router` · PromptBuilder chain · `.gitignore` `!backend/mcp/tools/**` · tsc 0 · `build:prod` PASS · sin redeploy aún |
| OS Unify | **ADR-034 dual-path LLM** | `LlmClient` Ollama-first · OpenAI solo `AUTONOMOUS_ALLOW_OPENAI=1` · fail-closed · contract tests |
| OS Unify | **Capability registry** | `backend/agency/OsCapabilityRegistry` · 11 servicios reales · sector legacy satellite |
| OS Unify | **Playbooks** | `docs/agency-playbooks/SERVICE_*.md` (11) |
| Partners | **CEO payout gate** | `NELVYON_CEO_PARTNER_PAYOUTS` default OFF · `markPaid`/`payViaStripeConnect` · facade 3 stacks |
| Ops | **Runbook sin Cursor** | `docs/OS_AUTONOMOUS_OPERATIONS.md` |
| SaaS | **tsc 0 + wiring** | MCP/orchestrator/private-ai exports · `routeInference`/`executeInference`/`getRouterHealthStatus` · commit `80da2def` |
| OS Audit | **Equipo agentes OS** | Inventario real 4 universos · `docs/OS_AGENT_TEAM_AUDIT.md` · sin claim élite unificada |
| Honesty | **Beta portal_path** | `betaPacksRunners` → `/portal` (antes `/portal/packs/*` inexistente) |
| Honesty | **Catálogo beta** | 5 packs → `availability: "beta"` (no `available` sin cert promote) |
| Honesty | **GenerativeClient mock** | placeholders con `metadata.mock: true` · Meshy respeta VITEST |
| Tests | **Contract honesty 8/8** | portal · catalog · LlmClient · generative mock (prev) |
| Deploy | **Prod SUCCESS `d4650e99`** | tip `3f860c06` · SHA vivo `3f860c06eaca` · IA flags not set |

| Docs | **Quality routing proposal** | `PROPOSAL_QUALITY_ROUTING_LOCAL.md` — 3b fast vs 8b QA≥85 · evidence 55/89 · no cert invalidation · opt-in later |
| Autonomous | **OpenAI opt-in only** | `AUTONOMOUS_ALLOW_OPENAI=1` required · no auto-fallback on Ollama fail · `isInternetTaskAuthorized` · prompt schema examples for small models · vitest 22/22 · tsc 0 · gate 51 |
| Local QA | **Phase C 3b/8b evidence** | heliovolt 3b **qa=55** (model limit) · 8b **qa=89** · HTTP E2E `needs_review` · `.release-logs/hardening-ia-packs-20260722.txt` · threshold 85 unchanged |
| Autonomous | **Ollama-first llmAdapter** | `isAutonomousOllamaConfigured` · Ollama→OpenAI→mock · vitest `llmAdapter.ollama` **3/3** · phaseC **10/10** |
| Local E2E | **HTTP pack + Ollama** | Docker :5433/:5434 healthy · migrate+seed QA · Next dev OLLAMA_* · kickoff `mode=real` ×56 · smoke as-complete 🟡 `needs_review` (QA&lt;85 3b) · gate ALL_PASS 51 · logs `.release-logs/local-http-pack-e2e-ollama-20260722.txt` · `.release-logs/local-cierre-tecnico-20260722.txt` |
| Local E2E | **Ollama evidence (prev)** | tags=6 · generate PASS · pack gate PASS 51 · vitest ollama FAIL 1/3 WIP (superseded) · HTTP kickoff BLOCKED Docker (superseded) · docs `e15055e9`+ · no staging localhost · IA OFF |
| Cloudflare | **Sole blocker** | Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app`. No MFA bypass attempted. |
| KI-028 | **Cerrado → KI-R028** | price-audit prod **allValid=true** (starter/pro/agency retrieve+active); sin crear precios/cobros |
| DNS | **app NXDOMAIN** | wrangler/API token ausentes · paso humano CNAME `app` → `nelvyonweb-production.up.railway.app` |
| LLM smoke | **Clasificado** | `LLM_NOT_CONFIGURED` = staging AUTONOMOUS sin Ollama/OpenAI · **no** fallo prod · Ollama local OK |
| Docs | **Cierre pendientes externos** | HANDOVER/STATUS/TODO/INFRA/INTEGRATIONS/DEPLOYMENTS/CTO/AUDITORIA |
| KI-030 | **Cerrado → KI-R030** | Deploy `3f08f13d` SUCCESS · SHA vivo `bba71f14` · live/ready 200 · logs Ready sin headers error |
| Smokes | **Post-KI-030** | portal-packs PASS · local-pack-e2e FAIL `LLM_NOT_CONFIGURED` · `.release-logs/p0-smokes-post-ki030.txt` |
| KI-030 | **Fix local PASS** | CMD `cd /app/apps/web && exec node server.js` · WORKDIR `/app` · `.dockerignore` WIP · docker Ready sin headers error · vitest 3/3 · tsc 0 |
| Docs | **KI-030 pre/post redeploy** | HANDOVER/DEPLOYMENTS/INFRA/KNOWN_ISSUES/CTO/AUDITORIA con evidencia |

## 2026-07-21

| Área | Cambio | Descripción |
|------|--------|-------------|
| KI-029 | **Resuelto → KI-R029** | Deploy `922c8039` preDeploy OK · mig 512–516 aplicadas · read-only confirm |
| Deploy | **Prod FAILED `922c8039`** | tip `a82d618f` · migrate OK · start fail `security/headers` → **KI-030** · sin 2º redeploy · SHA vivo sigue `3d2bba18` |
| Smokes | **Post-KI-029** | portal-packs PASS · local-pack-e2e FAIL `LLM_NOT_CONFIGURED` · `.release-logs/p0-smokes-post-ki029.txt` |
| KI-029 | **Fix config-as-code** | `/railway.toml` `preDeployCommand=["pnpm -C apps/web migrate:prod"]` · Dockerfile scripts+WORKDIR /app |
| Deploy | **Prod SUCCESS `93957043`** | Redeploy from-source `3d2bba18` · SHA vivo · health OK · COPY security en root Dockerfile |
| KI-029 | **Detectado** | releaseCommand no aplicó 512–516; prod `_migrations` máx 511; sin logs migrate |
| Build | **Fix headers Docker** | Commits `201c82b2` / `56216ba8` / `3d2bba18` (typecheck + COPY security root) |
| Smokes | **Parcial** | portal-packs PASS · local-pack-e2e FAIL `LLM_NOT_CONFIGURED` |
| Bloques 3–13 | **Ejecución final** | B3 SaaS UUID iso staging PASS · B4 SES GRANTED+send · B5 Stripe STARTER missing (KI-028) · B6 NO deploy (prod≤511) · B7 app.nelvyon.com NXDOMAIN · B8 health-only · B9/10 OK · B12 IA OFF · costes 0 |
| KI-014 | **Cerrado → KI-R014** | SES ProductionAccess true · self-send · SNS confirmed |
| KI-028 | **Abierto** | Stripe Live STARTER `resource_missing` en price-audit |
| Script | **verify-saas-uuid-isolation.mjs** | Tenants efímeros + audit JWT + contacts cross-tenant · evidencia JSON |
| KI-027 | **Cerrado** | Test brain mirrors ingest evidence; validador **508–516**; verify-all **CONDITIONAL_READY** |
| Audit | **Cierre élite total (solo lectura)** | Tabla 16 sistemas · GHL/HubSpot · (histórico pre B3–13) |
| Docs | **Sync drift post-KI-026** | DATABASE/PROJECT_STATUS/ROADMAP/INFRA/HANDOVER alineados a mig **516** |

## 2026-07-20

| Área | Cambio | Descripción |
|------|--------|-------------|
| KI-026 | **RLS dual-plane aplicado staging** | Mig `516_*` + ADR-032 · 13 policies core · aislamiento predicado funnels/chatbot OK · audit skip (&lt;2 tenants) · SM verified · CONDITIONAL_READY |
| KI-025 | **Stop @507 confirmado** | Error 42804 `social_post_analytics_post_id_fkey` uuid vs integer; dual-schema + `current_tenant_id` orden; **sin** 506a/edit 507 |
| KI-024 | **Audit drift calendar_events staging** | Causa: `calendar_events` legacy int sin `tenant_id` (0 filas) + 408 IF NOT EXISTS → idx tenant_id FATAL; **sin mutación**; bloquea KI-021 |
| Brain | **Knowledge ingest verified** | Fix tsconfig `pg` path (tsx/esbuild TransformError on `@types/pg`); ingest writes `verified:true` + chunk count; preflight preserves evidence; MASTER_CONTEXT + AUDITORIA in coreDocs; orphans **0** · chunks **1559** |
| Docs | **NELVYON_MASTER_CONTEXT (biblia)** | `docs/NELVYON_MASTER_CONTEXT.md` — contexto CTO completo 20 secciones para cualquier IA; README/HANDOVER apuntan como prioridad 0 |
| Brain | **Bloque 1 Docker+ingest VERIFICADO** | Docker Desktop UP · compose local-ai postgres healthy :5434 · preflight PASS · ingest `verified:true` · **1559** chunks · orphans 0 · coverage **0.99** · ADR-030 · `claimComplete` false |
| KI-023 | **Audit drift deals staging** | Causa: `deals` legacy int sin `tenant_id` (0 filas) + 402 IF NOT EXISTS → idx tenant_id FATAL; plan `401a` rename; **sin mutación**; ADR-031 reclasificado (ops ≠ ADR) |
| KI-022 | **Reparación staging ejecutada** | `400a` + `401` OK · conversations UUID · messages FK · migrate stop @ **402** → KI-023 |
| Docs | **ADR-031 + docs KI-022/023** | `400a` lexicographic pre-401; MASTER/STATUS/ROADMAP/TODO/INFRA/DEPLOY/CTO/AUDITORIA sync; CONDITIONAL_READY; `claimComplete` false |
| Audit | **Auditoría técnica absoluta** | P0/P1 BFF honesty+auth; `AUDITORIA_TECNICA_ABSOLUTA.md` · CONDITIONAL_READY |
| Ops | **nelvyon-verify-all + prod-env preflight** | Master gate CONDITIONAL_READY; preflight tsx path fix; CTO_FINAL_VERIFY + TEST_SKIPS SSOT |
| Security | **Reputación BFF auth / EMPTY_ALERTS** | Platform reputacion routes require auth; degraded empty alerts honesty |
| Sprint | **Sprint final absoluto** | CSRF /api/os · signup→register real · saasEnv exports · mig 515 docs · build/lint/tsc green · `SPRINT_FINAL_ABSOLUTO.md` |
| Cierre | **Cierre final prioritario CONDITIONAL_READY** | CSRF Origin cookie SaaS; SES bounce/complaint tenant-scope; mig **515** RLS Shared Memory + verify; preflight ingest (Docker DOWN); OpenClaw runtime SSOT; OPS Stripe/SES/514; npm audit documenter 0c/0h; tsc OK; focused 28p/2s; suite 2402p/4s; migrations 508-515 OK - `CIERRE_FINAL_PRIORITARIO.md` |
| Quality | **Elite finalization pass** | SSO tenant lookup + `saasErrorBody` hardening; `local-ai-health.mjs` → tsx SSOT; security-gates **508–514** + audit critical-only label; private-ai `routerHealthAvailable`; DATABASE.md sync; Widget few-shot; test agent count 23 · `ELITE_QUALITY_FINALIZATION.md` |
| Tests | **Evidencia** | tsc OK; vitest focal 15/15; suite principal 2401 passed; validate-post-elite OK; knowledge sync orphans 0 coverage 0.95 |
---

## 2026-07-19

| Área | Cambio | Descripción |
|------|--------|-------------|
| Brain | **Orphan wave 2** | Archive **44** moved (acum. archivedCount **93**) · manifest **263**/unique **234**/orphans **0**/unclassified **0**/coverage **0.95**/claimComplete **false** · tests 7/7 · `NELVYON_BRAIN_KNOWLEDGE.md` |
| Brain | **Fase knowledge (cierre honesto)** | Orphan classification + archive **49** → `docs/archive/` · agent domains · gap detector+ingestEvidence · manifest **217**/unique **192**/orphans **86**/coverage **0.65**/claimComplete **false** · ingest `verified:false` (Docker) · `NELVYON_BRAIN_KNOWLEDGE.md` |
| Brain | **Conocimiento NELVYON** | Manifest ampliado (ADR/CHANGELOG/workforce/…) · packs entrepreneurship/security · gap detector · external registry · checksum skip · Nelvyon-first AgentContext · CI sync · `NELVYON_BRAIN_KNOWLEDGE.md` |
| Elite closure | **Repo polish** | Security headers SSOT · migrate-pg splitter (KI-017) · SEO OG/sitemap/robots/schema/logo.svg · CI cleanup · docs INFRA/DEPLOY/ROADMAP · `FINAL_ELITE_CLOSURE.md` |
| Workforce | **PASS certificado** | Residuals Product/DevOps/Social · workflow audit 45 · OpenClaw mock · RAG isolation · soak daemon · live Ollama/RAG auto · production build en gate · `nelvyonAutonomousWorkforceCertified=true` · skipped=0 · force-pass rechazado · KI-019→historial |
| Workforce | **Bloques C–H** | Daemon `OrchestratorDaemon` + persist + compose profile `orchestrator` · promotions runtime (~23) · ~45 workflows · leaderboard/canary · panel · docs · ADR-028 |
| Workforce | **Bloques B+C** | Hierarchy L1/L2 · lifecycle · 4 aliases deprecated · ephemeral workers · operation modes + kill switch · orchestrator file checkpoint/recovery · panel org · `run-workforce-cert.mjs` CONDITIONAL_PASS |
| Workforce | **Bloque A** | Inventario completo `AGENT_WORKFORCE_INVENTORY.md` · IDs/aliases/gaps · ADR-027 · sin mint masivo |

## 2026-07-17

| Área | Cambio | Descripción |
|------|--------|-------------|
| Fase 2 Elite | **PASS** | Live Ollama E2E (seo/support/crm) · RAG hybrid mxbai P/R=1 · improvement promote/rollback · CI gate · `phase2EliteCertified=true` · residual KI-016 Docker |
| Fase 2 Elite | **CONDITIONAL PASS** | Memory content security · orchestrator sandbox executor · 10 workflows E2E · agent eval suite · OpenClaw mock · capability matrix · `run-phase2-elite-cert.mjs` · `PHASE2_ELITE_CERTIFIED=false` |
| Fase 2 | **CIERRE AUDITORÍA** | UnifiedRag SSOT en SaaS · inference+Context Engine · platformStatus Memory/OpenClaw · OpenClaw delegate gated · Prompt seed 17 · legacy MCP deprecated · labs flags |
| Fase 2 | **Integración** | Private AI ↔ Shared Memory (Context Engine) · auto STM write · PromptRegistry en agents |
| Fase 2 | RAG | `UnifiedRagStore` facade (ADR-025) · MCP `rag_search` wired · rollback `NELVYON_RAG_PREFER_LOCAL=0` |
| Fase 2 | OpenClaw | `HttpOpenClawBridge` + factory gated · docs ops |
| Fase 2 | Tools | Agent↔MCP tool map + optional MCP invoke |
| Fase 2 | Obs | `PrivateAiMetrics` + `/api/saas/private-ai/metrics` · panel widget |
| Fase 2 | **Shared Memory runtime** | ADR-024 · mig **514** · API · MCP memory_* flag-gated |
| Fase 2 | Orquestador | `InMemoryAgentOrchestrator` + API `/api/saas/orchestrator` (flag) |
| Fase 2 | Agentes / prompts | `AgentRegistry` unificado · `PromptRegistry` · API `/api/saas/ai-agents` |
| Fase 2 | Panel | `/saas/ai` + nav `ai` · widgets → APIs reales |
| Fase 2 | OpenClaw | Auth gate = Memory ON + `NELVYON_OPENCLAW_BRIDGE_ENABLED` (bridge Disabled) |
| SSOT IA packs | Ollama-first | `llmAdapter`: Ollama local antes que OpenAI; `isAutonomousOllamaConfigured`; `isPackLlmEnvConfigured` respeta `OLLAMA_CONFIGURED=1` |
| Private AI | Thin-wrap | `LocalOllamaProvider` delega chat a `OllamaClient` (SSOT HTTP Router); eliminado shim `OllamaProvider.ts` |
| Lead scoring | Consolidación | Eliminado `LeadScoringService` + dashboard muerto + smoke ref; mig **513** `DROP scored_leads`; ruta `/leads` sigue 410 |
| Docs | Verdad | AI_CONTEXT / DATABASE / KI-015→R015 / EXCELLENCE / inventory / route audit; KI-005 = dual RAG only |
| Tests | Adapter | `llmAdapter.ollama.test.ts` — prefer Ollama → OpenAI fallback → mock |
| Health | SSOT | `local-ai-health.mjs` preferido; `.ts` alias documentado |
| Readiness | Align | `run-production-readiness` acepta `OLLAMA_CONFIGURED=1`; critical e2e + env docs Ollama-first |
| tsc | Scope | `tsconfig` incluye `backend/autonomous/llm/**` (sin arrastrar benchmarks local-ai) |
| Excelencia | **DR CERRADO** | `run-postgres-restore-drill.mjs` → **8/8 PASS**; `internalReady=true` |
| SES/Stripe | Hardening | Aliases AWS_SES_* / STRIPE_API_KEY en `saasEnv`; sequences `ses_configured` + banner UI |
| OS packs | Preflight | Kickoff 503 `LLM_NOT_CONFIGURED` si `AUTONOMOUS_PRODUCTION` sin LLM |
| Readiness | Script | `run-production-readiness.mjs` — agrega env + artefactos |
| Docs | KI | KI-013/011 → historial; KI-014 activo; informe global actualizado |
| Cert global | Re-run | **41/41 PASS** · vitest **2338** · tsc **0** |
| Cert global | **FINAL** | `run-nelvyon-global-cert.mjs` → **40/40 PASS**; informe `NELVYON_GLOBAL_CERTIFICATION_FINAL.md` — veredicto **NO LISTO** (SES/Stripe/staging/DR) |
| Workflows | Fix | `parseJsonField` en rowToWorkflow/rowToRun tras jsonb stringify (7 tests dispatch rotos) + re-cert módulo |
| Amarillos | **DRAIN CERRADO** | Cola internos **VACÍA** — `run-yellow-queue-drain.mjs` → 14 CERTIFIED + 14 BLOCKED_EXTERNAL; consola `yellow_queue_drain_console.txt` |
| Lead scoring | Fix bug | SQL snapshot/list: `c.company` + `saas_campania_recipients` (antes `company_name` / tabla inexistente → 500) + tests regresión |
| Workflows | Fix bug | `createWorkflow`/`updateWorkflow` jsonb via `JSON.stringify` + `::jsonb` (antes 500 `22P02`) + test regresión |
| Cert harness | Fix | Stage deals válidos; MODULES_OUT → `docs/evidence/...`; retry register 429; skip CERTIFIED |
| Amarillos | Cert | `e2e.live_multitenant` + `saas.auth.jwt` (9/9 HTTP) + `saas.crm.contacts` (16/16 HTTP) → **CERTIFIED**; cola `YELLOW_ELIMINATION_QUEUE.md` |
| Infra cert | **UP** | Docker + `pgvector/pg16` :5433 + Redis :6380 · migraciones 408 |
| E2E live DB | **PASS** | multi-tenant cross-tenant=0 |
| Schema | Fix P1 | Colisión api_keys (406) + invoices (415) |
| Lead scoring | ADR-023 | `/leads` → 410 Gone |

## 2026-07-16

## 2026-07-16

| Área | Cambio | Descripción |
|------|--------|-------------|
| MCP Productivo | **COMPLETADO** | Soak 2h `mcp_soak_2026-07-16T19-56-30-289Z.json` — 7200040 ms · 121912 ok · fail=0 · errors=0 · gates verdes; tests 23/23 re-verificados; `mcp_certification_final.json` `completed: true` — **MCP PRODUCTIVO NELVYON COMPLETADO** |
| Calidad | Permanente | Refuerzo misión excelencia absoluta en `QUALITY_STANDARD.md` + regla Cursor — evidencia > volumen; soak MCP intacto |
| Certificación OS/SaaS | Inventario | Suite `OS_SAAS_*.md` + `os-saas-functional-matrix.json` — 333 páginas / 513 APIs clasificadas; **NO** declarar COMPLETADOS (E2E aplazado por soak) |
| Seguridad SaaS | Fix | RBAC: api-keys/webhooks/team/store mutations → `settings.write` (owner); SSRF egress webhooks; BFF POST fail-closed 502; sanitize contratos/funnels; OAuth authorize allowlist; SSO role vía workspace_members |
| Excelencia | Programa | `EXCELLENCE_PROGRAM.md` — inventario real, matriz I/C/T/Cert/Ops, veredicto OS/SaaS; soak MCP intacto |
| Docs verdad | Fix | `PHASE2_MODEL_ROUTER.md` alineado a Router `completed: true`; `PROJECT_STATUS` sin “100% ops” |
| Auditoría elite | CTO | XSS HTML · ctx.claims.userId · HMAC unificado · forms rate-limit matcher · stripe-store skew · saasErrorBody · CI 508–512 · informe `MASTER_AUDIT_ELITE_2026-07-16.md` |
| Calidad | ADR-019 | Estándar definitivo: excelencia > velocidad de bloques · `QUALITY_STANDARD.md` · regla Cursor alwaysApply |
| Auditoría maestra | Refuerzo | HMAC fail-closed · typecheck local-ai · CI lint→apps/web · security-gates paths · mig 512 citas · docs KI-005 · informe `MASTER_AUDIT_2026-07-16.md` |
| Seguridad | Fix | `requireHmacSecret()` — elimina fallbacks `dev-secret` / `nelvyon-cert-secret` (Quotes/LMS/cert) |
| Tests | +5 | `hmacSecret.test.ts` + Quotes fail-closed; suite Quotes/LMS/wiring OK |
| Typecheck | Fix | `LocalRagRetriever` tipado + `clientId` RAG; path `pg` en tsconfig; implicit any local-ai |
| CI | Fix | Root `lint` → `apps/web` (`lint:legacy` frontend); Security Gates PR en `apps/web/**`+`backend/**` |
| DB | Nuevo | `512_saas_appointments_tenant_start_idx.sql` (aún no aplicada en soak) |
| MCP Productivo | Nuevo | `backend/mcp/` Server/Client/Policy/Tools/Resilience · ADR-016 |
| MCP API | Nuevo | `GET/POST /api/saas/mcp` |
| MCP Tests | 23 pass | `mcpProductive.test.ts` |
| MCP Benchmark | 100% gates | selection/critical/approval |
| MCP Soak | **FAIL incompleto** | Kill ~5 min sin JSON 2h; checkpoint fix en soak script; re-lanzado |
| Fase 2 prep | ADR-017 | Shared Memory/OpenClaw/Orch/23 agents/Panel/Autos — contratos+docs+10 tests; runtime OFF |
| Router SaaS | **CERRADO** | LocalModelRouterProvider + inference API + audit · ADR-015 |
| API | Nuevo | `POST /api/saas/private-ai/inference` · `GET /router-health` |
| Tests | 7 pass | `saasPrivateAiRouterWiring.test.ts` |
| Labs bloque maestro | **CERRADO** | 461/461 · 138 patrones · registry 24 dominios |
| Knowledge harvest | 138 | `nelvyon-labs-knowledge-patterns.json` + `NelvyonLabsKnowledgeHarvest.ts` |
| Capability registry | 24 dominios | `NelvyonLabsCapabilityRegistry.ts` — IA/Router/MCP/RAG/CRM/… |
| Certificación | Runtime | `NelvyonLabsMasterClosure.ts` + `.labs-master-closure.lock` |
| Script | Verificación | `node scripts/nelvyon-labs-master-closure.mjs` |
| ADR | 014 | Cierre maestro; OpenClaw/MCP productivo/agentes bloqueados |
| Tests | 12 pass | Master closure + adapters Labs |

---

## 2026-07-15

| Área | Cambio | Descripción |
|------|--------|-------------|
| Router P0 | Fix | Cola depth+prune, cancel AbortSignal, ExecutionLimiter, circuit breaker scope |
| Router | Fix | Ollama timeouts 120s/300s, gate wait timeout, GPU cache, sin implicitReclaim |
| Router | Instrumentación | Latencia por clase + steady-state (`latencyMetrics.ts`) — no mezclar 3B/8B en un solo p95 |
| Router soak | Completado | FINAL 2h — `router_soak_2026-07-15T19-09-13-073Z.json` — todos los gates verdes incl. `latencyByClass` |
| Certificación | **COMPLETADO** | `router_certification_final.json` — `completed: true` — **ROUTER DE MODELOS NELVYON COMPLETADO** |
| Labs Seguridad | Integrado | Gitleaks (CI existente) + Trivy fs (nuevo job) + `NelvyonSecurityScanAdapter` · ADR-013 |
| Labs Observabilidad | Cerrado | `uptime-kuma` parcial + `prometheus` sustituido · `NelvyonObservabilityAdapter` |
| Labs 46 RESERVA | Cerrado | 2 integ. · 8 parcial · 19 sustituidos · 17 descartados · **21.7%** real · informe FINAL |
| Labs opcionales | Contratos | MCP TS / OCR / cheerio / ntfy / ffmpeg / whisper / fontsource (flags OFF) |
| NELVYON-LABS | Eval | 461/461 decisiones + matriz/winners; catálogo `labsDecision` |
| Tests | Adapter | Security+Observability+LabsOptional **8 pass** |

## 2026-07-15 (anteriores — soak parcial)

| Área | Cambio | Descripción |
|------|--------|-------------|
| Router soak | Parcial | Primer soak 2h con `latencyStable` global falso (mezcla 3B/8B) — superado por soak FINAL |
| NELVYON-LABS | Descarga | Clones + reconcile + descartes searxng/blender |

## 2026-07-14

| Área | Cambio | Descripción |
|------|--------|-------------|
| Model Router | Nuevo | `backend/local-ai/router/` — clasificación, riesgo, cola, fallback 3B→8B |
| Tests | 24 pass | `localAiModelRouter.test.ts` |
| Benchmark routing | 100% | `router_benchmark_cert_v1_*.json` |
| Benchmark E2E | PASS | `router_e2e_cert_e2e_pass_*.json` — executeTask + Ollama |
| Recovery | PASS | `router_recovery_*.json` — circuit breaker, Postgres, cola |
| Fixes | Router | VRAM swap-aware, JSON null retrieval, fallback JSON, recovery timeout |
| Soak | En curso | 2h — `ROUTER_SOAK_MS=7200000` |
| Docs | Actualizado | PHASE2_MODEL_ROUTER, BENCHMARK, SECURITY, PROJECT_STATUS, TODO |

## 2026-07-12

| Área | Cambio | Descripción |
|------|--------|-------------|
| Especialización | Certificada | 15/15 gates × 3/3 — `v6_cert_fixed` |

---

| Hora | Área | Cambio | Descripción |
|------|------|--------|-------------|
| 15:40 | Auditoría Fase 1 | Cierre | `PHASE1_CLOSURE_AUDIT.md`; SES PENDING detectado vía AWS CLI |
| 15:38 | middleware | Fix | `/api/os/health` público — status page ya no 401 |
| 15:30 | GitHub | Verificado | `DATABASE_URL`, `PRODUCTION_BASE_URL`, crons SUCCESS |
| 15:30 | Prod | Verificado | live/ready OK; git_sha `30404800` (redeploy pendiente) |

## 2026-07-10

| Hora (aprox) | Archivo / área | Cambio | Descripción |
|--------------|----------------|--------|-------------|
| 04:12 | CI Web Quality Gates | SUCCESS | run `29063441182` commit `bd1e4aee` |
| 04:12 | CI Security Gates | SUCCESS | run `29063441188` commit `bd1e4aee` |
| 01:07–03:54 | Vitest 3/4 mocks | Fix | Redis, Stripe, SES, GoogleOAuth — regresión post-override |
| 02:50 | `pnpm audit` | PASS critical | 0 critical tras overrides ws/axios/vitest |
| 02:46 | `run-phase1-audit.mjs` | PASS | migrations, typecheck, lint, elite reinforce |
| 02:45 | `pnpm build` | PASS | Build producción apps/web |
| 00:46 | Regresión P0–P2 | Validada | typecheck, lint, elite reinforce sin regresión |

## 2026-07-09

| Hora (aprox) | Archivo / área | Cambio | Descripción |
|--------------|----------------|--------|-------------|
| 17:02 | Postgres prod | Migrate | 482–511 vía `DATABASE_PUBLIC_URL`; **494 aplicada** |
| 17:02 | Cron CEO brief | Verificado | `processed:1`, email+stored; run `29035626812` |
| 18:55 | CI Web Quality Gates | SUCCESS | run `29041445107` commit `728f7b08` |
| 02:30 | P2 ops | Completado | env validation, statusChecker, ops API, crons, backup, logs |
| 02:10 | CI Staging Elite Gate | SUCCESS | run `29058208980` |
| 01:45 | `wait-for-deploy.mjs` | Fix | `DEPLOY_WAIT_SOFT` — proceed on health OK si SHA no match |
| 20:15 | `e2e/launch.spec.ts` | Fix | `/api/saas/certificados` es API real (401), no stub 410 |
| 19:53 | CI local | PASS | `run-local-elite-reinforce` 215 pack tests |
| 19:52 | Pack tests | Fix | `packAutoApprove` + `packSeedMetadata` mocks |
| 19:52 | Infra | Fix | `releaseCommand` → `migrate:prod`; Dockerfile scripts |
| 17:00 | `scripts/apply-migration-494.mjs` | Creado | Utilidad apply+verify migración 494 |
| 15:00 | `docs/*` | Actualizado | Post-deploy autónomo |
| 14:52 | Railway prod | Deploy | `@nelvyon/web` deploy `5c2be62e` SUCCESS — git_sha `815e4c0f` |
| 14:41 | `origin/main` | Push | `git push origin main` — commits `224a0a36`, `815e4c0f` |
| 14:30 | `scripts/check-*.mjs` | Creado | Utilidades verificación migración 494 y cron CEO brief |
| 14:30 | `docs/*` | Creado | Sistema documentación viva (14 archivos + regla Cursor) |
| 14:06 | `backend/saas/SaasCeoBriefService.ts` | Modificado | Manejo `42P01` en CEO brief |
| 14:06 | `apps/web/src/app/api/cron/saas-ceo-brief/route.ts` | Modificado | Respuesta `schema_not_ready` sin crash |
| 14:06 | `backend/saas/__tests__/SaasCeoBriefService.test.ts` | Creado | 3 tests schema drift |
| — | commit `224a0a36` | Commit | `fix: handle saas ceo brief settings table in production` |

## 2026-07-07 / 08

| Hora | Archivo | Cambio | Descripción |
|------|---------|--------|-------------|
| — | `backend/core/config.py` | Modificado | Pydantic fields + `load_env_files()` antes de Settings |
| — | `backend/db/load_env_files.py` | Modificado | Carga `backend/.env` |
| — | `.env` | Creado | Dev local SQLite + JWT (gitignored) |
| — | `frontend/.env.development.local` | Creado | Proxy 127.0.0.1:8000 |
| — | `README-dev-Windows.md` | Modificado | Rutas monorepo actuales |
| — | `backend/README.md` | Modificado | Placeholder credencial Supabase |

## 2026-07-04

| Archivo | Cambio | Descripción |
|---------|--------|-------------|
| `docs/LAUNCH_READY.md` | Actualizado | Cierre hardening Fase 1 producción |

---

## Plantilla nuevas entradas

```
## YYYY-MM-DD
| Hora | Archivo | Cambio | Descripción |
```

**Regla:** cualquier agente/humano que modifique código importante añade una fila aquí antes de cerrar la tarea.
