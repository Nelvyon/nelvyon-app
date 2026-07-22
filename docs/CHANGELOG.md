# CHANGELOG — Documentación y cambios registrados

> Historial acumulativo. No eliminar entradas.


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
