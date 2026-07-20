# CHANGELOG â€” DocumentaciÃ³n y cambios registrados

> Historial acumulativo. No eliminar entradas.


## 2026-07-20

| Área | Cambio | Descripción |
|------|--------|-------------|
| Quality | **Elite finalization pass** | SSO tenant lookup + `saasErrorBody` hardening; `local-ai-health.mjs` → tsx SSOT; security-gates **508–514** + audit critical-only label; private-ai `routerHealthAvailable`; DATABASE.md sync; Widget few-shot; test agent count 23 — `ELITE_QUALITY_FINALIZATION.md` |
| Tests | **Evidencia** | tsc OK; vitest focal 15/15; suite principal 2401 passed; validate-post-elite OK; knowledge sync orphans 0 coverage 0.95 |
---

## 2026-07-19

| Ãrea | Cambio | DescripciÃ³n |
|------|--------|-------------|
| Brain | **Orphan wave 2** | Archive **44** moved (acum. archivedCount **93**) Â· manifest **263**/unique **234**/orphans **0**/unclassified **0**/coverage **0.95**/claimComplete **false** Â· tests 7/7 Â· `NELVYON_BRAIN_KNOWLEDGE.md` |
| Brain | **Fase knowledge (cierre honesto)** | Orphan classification + archive **49** â†’ `docs/archive/` Â· agent domains Â· gap detector+ingestEvidence Â· manifest **217**/unique **192**/orphans **86**/coverage **0.65**/claimComplete **false** Â· ingest `verified:false` (Docker) Â· `NELVYON_BRAIN_KNOWLEDGE.md` |
| Brain | **Conocimiento NELVYON** | Manifest ampliado (ADR/CHANGELOG/workforce/â€¦) Â· packs entrepreneurship/security Â· gap detector Â· external registry Â· checksum skip Â· Nelvyon-first AgentContext Â· CI sync Â· `NELVYON_BRAIN_KNOWLEDGE.md` |
| Elite closure | **Repo polish** | Security headers SSOT Â· migrate-pg splitter (KI-017) Â· SEO OG/sitemap/robots/schema/logo.svg Â· CI cleanup Â· docs INFRA/DEPLOY/ROADMAP Â· `FINAL_ELITE_CLOSURE.md` |
| Workforce | **PASS certificado** | Residuals Product/DevOps/Social Â· workflow audit 45 Â· OpenClaw mock Â· RAG isolation Â· soak daemon Â· live Ollama/RAG auto Â· production build en gate Â· `nelvyonAutonomousWorkforceCertified=true` Â· skipped=0 Â· force-pass rechazado Â· KI-019â†’historial |
| Workforce | **Bloques Câ€“H** | Daemon `OrchestratorDaemon` + persist + compose profile `orchestrator` Â· promotions runtime (~23) Â· ~45 workflows Â· leaderboard/canary Â· panel Â· docs Â· ADR-028 |
| Workforce | **Bloques B+C** | Hierarchy L1/L2 Â· lifecycle Â· 4 aliases deprecated Â· ephemeral workers Â· operation modes + kill switch Â· orchestrator file checkpoint/recovery Â· panel org Â· `run-workforce-cert.mjs` CONDITIONAL_PASS |
| Workforce | **Bloque A** | Inventario completo `AGENT_WORKFORCE_INVENTORY.md` Â· IDs/aliases/gaps Â· ADR-027 Â· sin mint masivo |

## 2026-07-17

| Ãrea | Cambio | DescripciÃ³n |
|------|--------|-------------|
| Fase 2 Elite | **PASS** | Live Ollama E2E (seo/support/crm) Â· RAG hybrid mxbai P/R=1 Â· improvement promote/rollback Â· CI gate Â· `phase2EliteCertified=true` Â· residual KI-016 Docker |
| Fase 2 Elite | **CONDITIONAL PASS** | Memory content security Â· orchestrator sandbox executor Â· 10 workflows E2E Â· agent eval suite Â· OpenClaw mock Â· capability matrix Â· `run-phase2-elite-cert.mjs` Â· `PHASE2_ELITE_CERTIFIED=false` |
| Fase 2 | **CIERRE AUDITORÃA** | UnifiedRag SSOT en SaaS Â· inference+Context Engine Â· platformStatus Memory/OpenClaw Â· OpenClaw delegate gated Â· Prompt seed 17 Â· legacy MCP deprecated Â· labs flags |
| Fase 2 | **IntegraciÃ³n** | Private AI â†” Shared Memory (Context Engine) Â· auto STM write Â· PromptRegistry en agents |
| Fase 2 | RAG | `UnifiedRagStore` facade (ADR-025) Â· MCP `rag_search` wired Â· rollback `NELVYON_RAG_PREFER_LOCAL=0` |
| Fase 2 | OpenClaw | `HttpOpenClawBridge` + factory gated Â· docs ops |
| Fase 2 | Tools | Agentâ†”MCP tool map + optional MCP invoke |
| Fase 2 | Obs | `PrivateAiMetrics` + `/api/saas/private-ai/metrics` Â· panel widget |
| Fase 2 | **Shared Memory runtime** | ADR-024 Â· mig **514** Â· API Â· MCP memory_* flag-gated |
| Fase 2 | Orquestador | `InMemoryAgentOrchestrator` + API `/api/saas/orchestrator` (flag) |
| Fase 2 | Agentes / prompts | `AgentRegistry` unificado Â· `PromptRegistry` Â· API `/api/saas/ai-agents` |
| Fase 2 | Panel | `/saas/ai` + nav `ai` Â· widgets â†’ APIs reales |
| Fase 2 | OpenClaw | Auth gate = Memory ON + `NELVYON_OPENCLAW_BRIDGE_ENABLED` (bridge Disabled) |
| SSOT IA packs | Ollama-first | `llmAdapter`: Ollama local antes que OpenAI; `isAutonomousOllamaConfigured`; `isPackLlmEnvConfigured` respeta `OLLAMA_CONFIGURED=1` |
| Private AI | Thin-wrap | `LocalOllamaProvider` delega chat a `OllamaClient` (SSOT HTTP Router); eliminado shim `OllamaProvider.ts` |
| Lead scoring | ConsolidaciÃ³n | Eliminado `LeadScoringService` + dashboard muerto + smoke ref; mig **513** `DROP scored_leads`; ruta `/leads` sigue 410 |
| Docs | Verdad | AI_CONTEXT / DATABASE / KI-015â†’R015 / EXCELLENCE / inventory / route audit; KI-005 = dual RAG only |
| Tests | Adapter | `llmAdapter.ollama.test.ts` â€” prefer Ollama â†’ OpenAI fallback â†’ mock |
| Health | SSOT | `local-ai-health.mjs` preferido; `.ts` alias documentado |
| Readiness | Align | `run-production-readiness` acepta `OLLAMA_CONFIGURED=1`; critical e2e + env docs Ollama-first |
| tsc | Scope | `tsconfig` incluye `backend/autonomous/llm/**` (sin arrastrar benchmarks local-ai) |
| Excelencia | **DR CERRADO** | `run-postgres-restore-drill.mjs` â†’ **8/8 PASS**; `internalReady=true` |
| SES/Stripe | Hardening | Aliases AWS_SES_* / STRIPE_API_KEY en `saasEnv`; sequences `ses_configured` + banner UI |
| OS packs | Preflight | Kickoff 503 `LLM_NOT_CONFIGURED` si `AUTONOMOUS_PRODUCTION` sin LLM |
| Readiness | Script | `run-production-readiness.mjs` â€” agrega env + artefactos |
| Docs | KI | KI-013/011 â†’ historial; KI-014 activo; informe global actualizado |
| Cert global | Re-run | **41/41 PASS** Â· vitest **2338** Â· tsc **0** |
| Cert global | **FINAL** | `run-nelvyon-global-cert.mjs` â†’ **40/40 PASS**; informe `NELVYON_GLOBAL_CERTIFICATION_FINAL.md` â€” veredicto **NO LISTO** (SES/Stripe/staging/DR) |
| Workflows | Fix | `parseJsonField` en rowToWorkflow/rowToRun tras jsonb stringify (7 tests dispatch rotos) + re-cert mÃ³dulo |
| Amarillos | **DRAIN CERRADO** | Cola internos **VACÃA** â€” `run-yellow-queue-drain.mjs` â†’ 14 CERTIFIED + 14 BLOCKED_EXTERNAL; consola `yellow_queue_drain_console.txt` |
| Lead scoring | Fix bug | SQL snapshot/list: `c.company` + `saas_campania_recipients` (antes `company_name` / tabla inexistente â†’ 500) + tests regresiÃ³n |
| Workflows | Fix bug | `createWorkflow`/`updateWorkflow` jsonb via `JSON.stringify` + `::jsonb` (antes 500 `22P02`) + test regresiÃ³n |
| Cert harness | Fix | Stage deals vÃ¡lidos; MODULES_OUT â†’ `docs/evidence/...`; retry register 429; skip CERTIFIED |
| Amarillos | Cert | `e2e.live_multitenant` + `saas.auth.jwt` (9/9 HTTP) + `saas.crm.contacts` (16/16 HTTP) â†’ **CERTIFIED**; cola `YELLOW_ELIMINATION_QUEUE.md` |
| Infra cert | **UP** | Docker + `pgvector/pg16` :5433 + Redis :6380 Â· migraciones 408 |
| E2E live DB | **PASS** | multi-tenant cross-tenant=0 |
| Schema | Fix P1 | ColisiÃ³n api_keys (406) + invoices (415) |
| Lead scoring | ADR-023 | `/leads` â†’ 410 Gone |

## 2026-07-16

## 2026-07-16

| Ãrea | Cambio | DescripciÃ³n |
|------|--------|-------------|
| MCP Productivo | **COMPLETADO** | Soak 2h `mcp_soak_2026-07-16T19-56-30-289Z.json` â€” 7200040 ms Â· 121912 ok Â· fail=0 Â· errors=0 Â· gates verdes; tests 23/23 re-verificados; `mcp_certification_final.json` `completed: true` â€” **MCP PRODUCTIVO NELVYON COMPLETADO** |
| Calidad | Permanente | Refuerzo misiÃ³n excelencia absoluta en `QUALITY_STANDARD.md` + regla Cursor â€” evidencia > volumen; soak MCP intacto |
| CertificaciÃ³n OS/SaaS | Inventario | Suite `OS_SAAS_*.md` + `os-saas-functional-matrix.json` â€” 333 pÃ¡ginas / 513 APIs clasificadas; **NO** declarar COMPLETADOS (E2E aplazado por soak) |
| Seguridad SaaS | Fix | RBAC: api-keys/webhooks/team/store mutations â†’ `settings.write` (owner); SSRF egress webhooks; BFF POST fail-closed 502; sanitize contratos/funnels; OAuth authorize allowlist; SSO role vÃ­a workspace_members |
| Excelencia | Programa | `EXCELLENCE_PROGRAM.md` â€” inventario real, matriz I/C/T/Cert/Ops, veredicto OS/SaaS; soak MCP intacto |
| Docs verdad | Fix | `PHASE2_MODEL_ROUTER.md` alineado a Router `completed: true`; `PROJECT_STATUS` sin â€œ100% opsâ€ |
| AuditorÃ­a elite | CTO | XSS HTML Â· ctx.claims.userId Â· HMAC unificado Â· forms rate-limit matcher Â· stripe-store skew Â· saasErrorBody Â· CI 508â€“512 Â· informe `MASTER_AUDIT_ELITE_2026-07-16.md` |
| Calidad | ADR-019 | EstÃ¡ndar definitivo: excelencia > velocidad de bloques Â· `QUALITY_STANDARD.md` Â· regla Cursor alwaysApply |
| AuditorÃ­a maestra | Refuerzo | HMAC fail-closed Â· typecheck local-ai Â· CI lintâ†’apps/web Â· security-gates paths Â· mig 512 citas Â· docs KI-005 Â· informe `MASTER_AUDIT_2026-07-16.md` |
| Seguridad | Fix | `requireHmacSecret()` â€” elimina fallbacks `dev-secret` / `nelvyon-cert-secret` (Quotes/LMS/cert) |
| Tests | +5 | `hmacSecret.test.ts` + Quotes fail-closed; suite Quotes/LMS/wiring OK |
| Typecheck | Fix | `LocalRagRetriever` tipado + `clientId` RAG; path `pg` en tsconfig; implicit any local-ai |
| CI | Fix | Root `lint` â†’ `apps/web` (`lint:legacy` frontend); Security Gates PR en `apps/web/**`+`backend/**` |
| DB | Nuevo | `512_saas_appointments_tenant_start_idx.sql` (aÃºn no aplicada en soak) |
| MCP Productivo | Nuevo | `backend/mcp/` Server/Client/Policy/Tools/Resilience Â· ADR-016 |
| MCP API | Nuevo | `GET/POST /api/saas/mcp` |
| MCP Tests | 23 pass | `mcpProductive.test.ts` |
| MCP Benchmark | 100% gates | selection/critical/approval |
| MCP Soak | **FAIL incompleto** | Kill ~5 min sin JSON 2h; checkpoint fix en soak script; re-lanzado |
| Fase 2 prep | ADR-017 | Shared Memory/OpenClaw/Orch/23 agents/Panel/Autos â€” contratos+docs+10 tests; runtime OFF |
| Router SaaS | **CERRADO** | LocalModelRouterProvider + inference API + audit Â· ADR-015 |
| API | Nuevo | `POST /api/saas/private-ai/inference` Â· `GET /router-health` |
| Tests | 7 pass | `saasPrivateAiRouterWiring.test.ts` |
| Labs bloque maestro | **CERRADO** | 461/461 Â· 138 patrones Â· registry 24 dominios |
| Knowledge harvest | 138 | `nelvyon-labs-knowledge-patterns.json` + `NelvyonLabsKnowledgeHarvest.ts` |
| Capability registry | 24 dominios | `NelvyonLabsCapabilityRegistry.ts` â€” IA/Router/MCP/RAG/CRM/â€¦ |
| CertificaciÃ³n | Runtime | `NelvyonLabsMasterClosure.ts` + `.labs-master-closure.lock` |
| Script | VerificaciÃ³n | `node scripts/nelvyon-labs-master-closure.mjs` |
| ADR | 014 | Cierre maestro; OpenClaw/MCP productivo/agentes bloqueados |
| Tests | 12 pass | Master closure + adapters Labs |

---

## 2026-07-15

| Ãrea | Cambio | DescripciÃ³n |
|------|--------|-------------|
| Router P0 | Fix | Cola depth+prune, cancel AbortSignal, ExecutionLimiter, circuit breaker scope |
| Router | Fix | Ollama timeouts 120s/300s, gate wait timeout, GPU cache, sin implicitReclaim |
| Router | InstrumentaciÃ³n | Latencia por clase + steady-state (`latencyMetrics.ts`) â€” no mezclar 3B/8B en un solo p95 |
| Router soak | Completado | FINAL 2h â€” `router_soak_2026-07-15T19-09-13-073Z.json` â€” todos los gates verdes incl. `latencyByClass` |
| CertificaciÃ³n | **COMPLETADO** | `router_certification_final.json` â€” `completed: true` â€” **ROUTER DE MODELOS NELVYON COMPLETADO** |
| Labs Seguridad | Integrado | Gitleaks (CI existente) + Trivy fs (nuevo job) + `NelvyonSecurityScanAdapter` Â· ADR-013 |
| Labs Observabilidad | Cerrado | `uptime-kuma` parcial + `prometheus` sustituido Â· `NelvyonObservabilityAdapter` |
| Labs 46 RESERVA | Cerrado | 2 integ. Â· 8 parcial Â· 19 sustituidos Â· 17 descartados Â· **21.7%** real Â· informe FINAL |
| Labs opcionales | Contratos | MCP TS / OCR / cheerio / ntfy / ffmpeg / whisper / fontsource (flags OFF) |
| NELVYON-LABS | Eval | 461/461 decisiones + matriz/winners; catÃ¡logo `labsDecision` |
| Tests | Adapter | Security+Observability+LabsOptional **8 pass** |

## 2026-07-15 (anteriores â€” soak parcial)

| Ãrea | Cambio | DescripciÃ³n |
|------|--------|-------------|
| Router soak | Parcial | Primer soak 2h con `latencyStable` global falso (mezcla 3B/8B) â€” superado por soak FINAL |
| NELVYON-LABS | Descarga | Clones + reconcile + descartes searxng/blender |

## 2026-07-14

| Ãrea | Cambio | DescripciÃ³n |
|------|--------|-------------|
| Model Router | Nuevo | `backend/local-ai/router/` â€” clasificaciÃ³n, riesgo, cola, fallback 3Bâ†’8B |
| Tests | 24 pass | `localAiModelRouter.test.ts` |
| Benchmark routing | 100% | `router_benchmark_cert_v1_*.json` |
| Benchmark E2E | PASS | `router_e2e_cert_e2e_pass_*.json` â€” executeTask + Ollama |
| Recovery | PASS | `router_recovery_*.json` â€” circuit breaker, Postgres, cola |
| Fixes | Router | VRAM swap-aware, JSON null retrieval, fallback JSON, recovery timeout |
| Soak | En curso | 2h â€” `ROUTER_SOAK_MS=7200000` |
| Docs | Actualizado | PHASE2_MODEL_ROUTER, BENCHMARK, SECURITY, PROJECT_STATUS, TODO |

## 2026-07-12

| Ãrea | Cambio | DescripciÃ³n |
|------|--------|-------------|
| EspecializaciÃ³n | Certificada | 15/15 gates Ã— 3/3 â€” `v6_cert_fixed` |

---

| Hora | Ãrea | Cambio | DescripciÃ³n |
|------|------|--------|-------------|
| 15:40 | AuditorÃ­a Fase 1 | Cierre | `PHASE1_CLOSURE_AUDIT.md`; SES PENDING detectado vÃ­a AWS CLI |
| 15:38 | middleware | Fix | `/api/os/health` pÃºblico â€” status page ya no 401 |
| 15:30 | GitHub | Verificado | `DATABASE_URL`, `PRODUCTION_BASE_URL`, crons SUCCESS |
| 15:30 | Prod | Verificado | live/ready OK; git_sha `30404800` (redeploy pendiente) |

## 2026-07-10

| Hora (aprox) | Archivo / Ã¡rea | Cambio | DescripciÃ³n |
|--------------|----------------|--------|-------------|
| 04:12 | CI Web Quality Gates | SUCCESS | run `29063441182` commit `bd1e4aee` |
| 04:12 | CI Security Gates | SUCCESS | run `29063441188` commit `bd1e4aee` |
| 01:07â€“03:54 | Vitest 3/4 mocks | Fix | Redis, Stripe, SES, GoogleOAuth â€” regresiÃ³n post-override |
| 02:50 | `pnpm audit` | PASS critical | 0 critical tras overrides ws/axios/vitest |
| 02:46 | `run-phase1-audit.mjs` | PASS | migrations, typecheck, lint, elite reinforce |
| 02:45 | `pnpm build` | PASS | Build producciÃ³n apps/web |
| 00:46 | RegresiÃ³n P0â€“P2 | Validada | typecheck, lint, elite reinforce sin regresiÃ³n |

## 2026-07-09

| Hora (aprox) | Archivo / Ã¡rea | Cambio | DescripciÃ³n |
|--------------|----------------|--------|-------------|
| 17:02 | Postgres prod | Migrate | 482â€“511 vÃ­a `DATABASE_PUBLIC_URL`; **494 aplicada** |
| 17:02 | Cron CEO brief | Verificado | `processed:1`, email+stored; run `29035626812` |
| 18:55 | CI Web Quality Gates | SUCCESS | run `29041445107` commit `728f7b08` |
| 02:30 | P2 ops | Completado | env validation, statusChecker, ops API, crons, backup, logs |
| 02:10 | CI Staging Elite Gate | SUCCESS | run `29058208980` |
| 01:45 | `wait-for-deploy.mjs` | Fix | `DEPLOY_WAIT_SOFT` â€” proceed on health OK si SHA no match |
| 20:15 | `e2e/launch.spec.ts` | Fix | `/api/saas/certificados` es API real (401), no stub 410 |
| 19:53 | CI local | PASS | `run-local-elite-reinforce` 215 pack tests |
| 19:52 | Pack tests | Fix | `packAutoApprove` + `packSeedMetadata` mocks |
| 19:52 | Infra | Fix | `releaseCommand` â†’ `migrate:prod`; Dockerfile scripts |
| 17:00 | `scripts/apply-migration-494.mjs` | Creado | Utilidad apply+verify migraciÃ³n 494 |
| 15:00 | `docs/*` | Actualizado | Post-deploy autÃ³nomo |
| 14:52 | Railway prod | Deploy | `@nelvyon/web` deploy `5c2be62e` SUCCESS â€” git_sha `815e4c0f` |
| 14:41 | `origin/main` | Push | `git push origin main` â€” commits `224a0a36`, `815e4c0f` |
| 14:30 | `scripts/check-*.mjs` | Creado | Utilidades verificaciÃ³n migraciÃ³n 494 y cron CEO brief |
| 14:30 | `docs/*` | Creado | Sistema documentaciÃ³n viva (14 archivos + regla Cursor) |
| 14:06 | `backend/saas/SaasCeoBriefService.ts` | Modificado | Manejo `42P01` en CEO brief |
| 14:06 | `apps/web/src/app/api/cron/saas-ceo-brief/route.ts` | Modificado | Respuesta `schema_not_ready` sin crash |
| 14:06 | `backend/saas/__tests__/SaasCeoBriefService.test.ts` | Creado | 3 tests schema drift |
| â€” | commit `224a0a36` | Commit | `fix: handle saas ceo brief settings table in production` |

## 2026-07-07 / 08

| Hora | Archivo | Cambio | DescripciÃ³n |
|------|---------|--------|-------------|
| â€” | `backend/core/config.py` | Modificado | Pydantic fields + `load_env_files()` antes de Settings |
| â€” | `backend/db/load_env_files.py` | Modificado | Carga `backend/.env` |
| â€” | `.env` | Creado | Dev local SQLite + JWT (gitignored) |
| â€” | `frontend/.env.development.local` | Creado | Proxy 127.0.0.1:8000 |
| â€” | `README-dev-Windows.md` | Modificado | Rutas monorepo actuales |
| â€” | `backend/README.md` | Modificado | Placeholder credencial Supabase |

## 2026-07-04

| Archivo | Cambio | DescripciÃ³n |
|---------|--------|-------------|
| `docs/LAUNCH_READY.md` | Actualizado | Cierre hardening Fase 1 producciÃ³n |

---

## Plantilla nuevas entradas

```
## YYYY-MM-DD
| Hora | Archivo | Cambio | DescripciÃ³n |
```

**Regla:** cualquier agente/humano que modifique cÃ³digo importante aÃ±ade una fila aquÃ­ antes de cerrar la tarea.
