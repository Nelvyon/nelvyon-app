# DECISIONS — Decisiones técnicas (ADR)

> No eliminar entradas. Añadir nuevas al final.

---

## ADR-001 — Monorepo pnpm con apps/web como producto principal

| Campo | Valor |
|-------|-------|
| **Fecha** | 2025–2026 (evolución) |
| **Decisión** | Next.js en `apps/web` es el deploy Railway; `frontend/` Vite queda legacy |
| **Por qué** | App Router, BFF API routes, SSR, un solo artefacto Docker |
| **Consecuencias** | Dev local puede usar Vite legacy; prod solo `apps/web` |

---

## ADR-002 — Migraciones SQL numeradas vs solo Alembic

| Campo | Valor |
|-------|-------|
| **Fecha** | 2025+ |
| **Decisión** | Fuente de verdad: `backend/db/migrations/*.sql` + `migrate.ts`; Alembic Python secundario |
| **Por qué** | Next.js/TS es el path crítico; Railway releaseCommand ejecuta migrate.ts |
| **Consecuencias** | Dos sistemas coexisten; no borrar SQL; verificar `_migrations` en prod |

---

## ADR-003 — Auth SaaS JWT en cookies httpOnly

| Campo | Valor |
|-------|-------|
| **Fecha** | 2025+ |
| **Decisión** | `JWT_SECRET` en cookie; `requireSaasContext` en rutas `/api/saas/*` |
| **Por qué** | Seguridad XSS; alineación Next.js BFF |
| **Consecuencias** | Usar `127.0.0.1` consistente en dev (cookies) |

---

## ADR-004 — DATABASE_URL service_role (bypass RLS)

| Campo | Valor |
|-------|-------|
| **Fecha** | Migración 280 |
| **Decisión** | Backend usa Postgres service_role; nunca anon key en servidor |
| **Por qué** | RLS para clientes; operaciones BFF necesitan bypass controlado |
| **Consecuencias** | Documentar en `ENVIRONMENTS.md`; rotar si filtra |

---

## ADR-005 — Private AI: preparado pero no obligatorio

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026 (migraciones 503–504) |
| **Decisión** | `UnconfiguredProvider` por defecto; Nelvyon no depende de LLM externo para arrancar |
| **Por qué** | Deploy seguro; activación por env cuando listo |
| **Consecuencias** | Agentes en catálogo sin runtime hasta Fase 2 |

---

## ADR-006 — OpenClaw como plugin opcional

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026 |
| **Decisión** | `DisabledOpenClawBridge` por defecto; Nelvyon posee orquestación |
| **Por qué** | Evitar acoplamiento a orchestrator externo |
| **Consecuencias** | `NELVYON_OPENCLAW_BRIDGE_ENABLED=1` solo si se adopta |

---

## ADR-007 — Settings Python: Pydantic explícito (no __getattr__)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-07 |
| **Decisión** | `database_url` y campos críticos declarados; `load_env_files()` antes de `Settings()` |
| **Por qué** | Error `AttributeError database_url` en prod/dev sin env |
| **Consecuencias** | Nuevas vars Python → añadir campo en `config.py` |

---

## ADR-008 — CEO brief cron: degradación graceful sin tabla

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-09 |
| **Decisión** | Cron devuelve `skipped: schema_not_ready` en `42P01`; migración 494 sigue siendo fix definitivo |
| **Por qué** | Evitar 500 en cron GitHub Actions mientras migrate no corre |
| **Consecuencias** | Prod debe aplicar 494 para funcionalidad completa |

---

## ADR-009 — Documentación viva en docs/HANDOVER.md

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-09 |
| **Decisión** | HANDOVER.md es fuente de continuidad; actualización obligatoria post-cambio |
| **Por qué** | No depender de memoria humana ni chats previos |
| **Consecuencias** | Regla Cursor `.cursor/rules/live-documentation.mdc` |

---

## ADR-011 — releaseCommand unificado con migrate:prod

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-09 |
| **Decisión** | Railway `releaseCommand` = `pnpm migrate:prod` (apps/web); root = `pnpm -C apps/web migrate:prod` |
| **Por qué** | Comandos `tsx` directos inconsistentes; `migrate-prod.ts` valida `DATABASE_URL` y logs claros |
| **Consecuencias** | Dockerfile runner copia `apps/web/scripts/` para release en imagen prod |

---

## ADR-010 — Verificación prod vía Railway CLI + scripts internos

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-09 |
| **Decisión** | Scripts `scripts/check-migration-494.mjs` y `check-cron-ceo-brief.mjs` se ejecutan dentro del contenedor Railway (`railway ssh`) |
| **Por qué** | `DATABASE_URL` prod usa hostname interno `postgres.railway.internal`; `railway run` local falla con ENOTFOUND |
| **Consecuencias** | Requiere SSH keys registradas en Railway; sin ellas solo health/git_sha y releaseCommand inferido |

---

## ADR-012 — Security Gates: fail on critical only + overrides en pnpm-workspace

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-10 |
| **Decisión** | CI `security-gates.yml` falla en `pnpm audit --audit-level critical`; overrides (`ws`, `axios`, `vitest`) en `pnpm-workspace.yaml` (pnpm 10+) |
| **Por qué** | Eliminar 3 critical (vitest legacy frontend, ws twilio); high transitive documentadas sin ocultar |
| **Consecuencias** | 17 high restantes monitoreadas; Dependabot semanal; no exclusiones globales Gitleaks |

---

## ADR-013 — NELVYON-LABS bloque Seguridad: adaptadores Trivy/Gitleaks (sin vendor)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-15 |
| **Decisión** | Integrar **Gitleaks** (ya en CI) y **Trivy fs** vía Action oficial + adaptador `backend/security/NelvyonSecurityScanAdapter.ts`; **no** copiar repos de NELVYON-LABS a `nelvyon-app` |
| **Por qué** | Ganadores Labs bloque 1; mejora demostrable (vuln scan deps/fs + secrets); rollback por feature flag / job `if` |
| **Consecuencias** | `security-gates.yml` + job `trivy-fs`; flags `NELVYON_GITLEAKS_ENABLED` / `NELVYON_TRIVY_ENABLED`; OpenClaw/MCP bloqueados hasta cierre bloque 1 |
| **Rollback** | Variables repo = `0` → jobs omitidos; sin cambio de runtime SaaS |

---

## ADR-014 — NELVYON-LABS bloque maestro: cierre 461/461 sin vendor copy

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-16 |
| **Decisión** | Cerrar **461/461** con estados definitivos; cosechar **138** patrones en `nelvyon-labs-knowledge-patterns.json`; registry **24** dominios en `NelvyonLabsCapabilityRegistry.ts`; certificación `NelvyonLabsMasterClosure.ts` + lock `.labs-master-closure.lock` |
| **Por qué** | Aprovechar arquitecturas/patrones/algoritmos sin copiar monorepos Labs; stack NELVYON superior donde sustituye; PRIVATE_MODE + Router certificado intactos |
| **Consecuencias** | 10 ganador · 8 parcial · 138 conocimiento · 19 sustituido · 269 descartados (duplicidad/licencia/incompat/evidencia); **OpenClaw/MCP productivo/orquestador/agentes/panel bloqueados** hasta fase siguiente |
| **Rollback** | Flags `NELVYON_*` off; sin servicios persistentes nuevos; RAM/VRAM runtime 0 |
| **Evidencia** | `docs/NELVYON_LABS_MASTER_CLOSURE.md` · `node scripts/nelvyon-labs-master-closure.mjs` |

---

## ADR-015 — Router certificado → SaaS Private AI (wiring HTTP)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-16 |
| **Decisión** | `LocalModelRouterProvider` en cadena Private AI (`local_router` → `local_ollama`); `SaasPrivateAiService.executeInference/routeInference`; rutas `/api/saas/private-ai/inference` y `/router-health` con `requireSaasContext` |
| **Por qué** | Unificar agentes SaaS con Router certificado (RAG, gate, fallback 8B, SecurityGuard) sin duplicar fetch Ollama crudo |
| **Consecuencias** | `routerContext.tenantId` obligatorio en completions; audit en `saas_private_ai_audit`; rollback `NELVYON_LOCAL_ROUTER_ENABLED=0` |
| **Evidencia** | `docs/PHASE2_ROUTER_SAAS_WIRING.md` · tests `saasPrivateAiRouterWiring.test.ts` |

---

## ADR-016 — MCP Productivo enterprise (sin OpenClaw)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-16 |
| **Decisión** | Capa `backend/mcp/` productiva: ToolRegistry, PolicyEngine, Client/Server, resiliencia, approvals, Router bridge, API `/api/saas/mcp`; tools destructivas denied; high → approval_required |
| **Por qué** | Capa segura de herramientas para Router/orquestador/agentes futuros; PRIVATE_MODE; sin vendor SDK obligatorio |
| **Consecuencias** | Flag `NELVYON_MCP_PRODUCTIVE_ENABLED`; certificación `completed: true` (2026-07-16); OpenClaw/orquestador/agentes siguen bloqueados (ADR-017) hasta Shared Memory runtime + decisión producto |
| **Evidencia** | `mcp_certification_final.json` · soak `mcp_soak_2026-07-16T19-56-30-289Z.json` · `mcpProductive.test.ts` 23 pass · benchmark 100% gates |

---

## ADR-017 — Prep post-MCP: Shared Memory / OpenClaw / Orquestador / Agentes / Panel (sin runtime)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-16 |
| **Decisión** | Mientras soak MCP corre, preparar **solo contratos** en `backend/shared-memory`, `openclaw`, `orchestrator`, `agents`, `ai-panel`, `automations` + docs `PHASE2_*`. Flags OFF. Schema memoria en `schema.proposed.sql` (no migrar aún). |
| **Por qué** | Cero tiempo muerto; arranque inmediato de Memoria Compartida tras cert MCP; sin invalidar soak/Router |
| **Consecuencias** | Runtime Shared Memory = siguiente bloque implementación; OpenClaw/orch/agentes/panel siguen bloqueados hasta orden obligatorio |
| **Evidencia** | `docs/PHASE2_PREP_INDEX.md` · tests prep 10 pass |

---

## ADR-018 — Auditoría maestra soak-safe: HMAC fail-closed + CI producto

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-16 |
| **Decisión** | Durante soak MCP, solo mejoras objetivas fuera de MCP/Router: `requireHmacSecret()` sin fallbacks hardcodeados; root `lint` → `apps/web`; Security Gates PR en `apps/web/**`+`backend/**`; mig 512 índice citas **autorada** sin apply en DB soak; typecheck local-ai en path Private AI |
| **Por qué** | Firmas forjables y CI engañoso son riesgo enterprise inmediato; no invalidar evidencia de soak |
| **Consecuencias** | Quotes/LMS/cert fallan cerrados sin secret ≥32; `lint:legacy` para Vite; aplicar 512 en próximo deploy seguro |
| **Evidencia** | `docs/MASTER_AUDIT_2026-07-16.md` · `hmacSecret.test.ts` · `tsc` PASS |

---

## ADR-019 — Estándar definitivo de calidad (excelencia > velocidad de bloques)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-16 |
| **Decisión** | Criterio permanente: aceptar solo mejoras objetivas (limpieza, mantenibilidad, seguridad, escalabilidad, rendimiento, simplicidad, coherencia arquitectónica). Cerrar bloques solo con evidencia de que no queda mejora de alto impacto razonable. Prohibido “perfecto”, placeholders, deuda evitable, docs ficticias, reescrituras sin justificación. |
| **Por qué** | Cantidad de bloques no garantiza producto enterprise; un arquitecto senior debe poder auditar coherencia, seguridad, tests y docs reales |
| **Consecuencias** | Regla Cursor `enterprise-quality.mdc` alwaysApply; doc `QUALITY_STANDARD.md`; todo trabajo futuro (OS/SaaS/IA/infra) se juzga con este listón, sin invalidar Router/MCP/PRIVATE_MODE |
| **Evidencia** | `.cursor/rules/enterprise-quality.mdc` · `docs/QUALITY_STANDARD.md` |

---

## ADR-020 — Auditoría elite soak-safe (auth context, XSS, rate-limit matcher)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-16 |
| **Decisión** | Durante soak MCP, aplicar solo P0/P1 objetivos: `ctx.claims.userId`, `escapeHtml` cert/citas, HMAC ≥32 en tracking/portal/OAuth, middleware matcher forms/contact, stripe-store skew+timingSafe, `saasErrorBody` genérico, web-gates 508–512 |
| **Por qué** | Bugs reales (partner roto, XSS, rate-limit muerto, leak 500) sin invalidar evidencia soak |
| **Consecuencias** | Lead-scoring/Ollama/mig apply aplazados; informe `MASTER_AUDIT_ELITE_2026-07-16.md` |
| **Evidencia** | 42 tests PASS · anti-stub PASS · tsc PASS · soak fail=0 |

---

## ADR-021 — Programa definitivo de excelencia (verdad > declaración)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-16 |
| **Decisión** | Ejecutar programa por fases con distinción implementado/conectado/probado/certificado/desplegado/operativo; mapa + matriz en `EXCELLENCE_PROGRAM.md`; soak MCP intacto; certificar solo con artefactos; no “100%/perfecto” sin métricas |
| **Por qué** | Evitar progreso simulado por docs/archivos; alinear CTO/owner con evidencia reproducible |
| **Consecuencias** | Orden bloqueante post-MCP: cert → mig 512 → lead-scoring → Ollama/RAG → UUID 505 → regresión → Shared Memory… |
| **Evidencia** | `docs/EXCELLENCE_PROGRAM.md` · checkpoint soak · tsc/tests snapshot |

---

## ADR-022 — Hardening SaaS: RBAC write, SSRF, BFF fail-closed, XSS public HTML

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-16 |
| **Decisión** | Mutaciones privilegiadas (api-keys, webhooks, team, store settings) exigen `settings.write` (owner). Webhooks: `assertSafeEgressUrl`. BFF POST: 502 sin mock. Contratos/funnels: `sanitizeRichHtml`. OAuth connect: allowlist hosts. SSO: rol desde `workspace_members`. |
| **Por qué** | Escalada de privilegios (viewer mint `*`), SSRF, mocks silenciosos y XSS público son P0/P1 objetivos sin invalidar soak MCP |
| **Consecuencias** | Solo owner muta esos settings; CI `check-saas-privileged-write.mjs`; tests SSRF/XSS/RBAC/OAuth |
| **Evidencia** | vitest suites + tsc PASS · soak MCP fail=0 |

---

## ADR-023 — Lead scoring SSOT (eliminar dual stack HTTP)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-17 |
| **Decisión** | Fuente de verdad: `SaasLeadScoringService` + `/api/saas/lead-scoring`. Ruta legacy `/api/saas/lead-scoring/leads` responde **410 Gone**. |
| **Por qué** | Dos sistemas de scoring (tenant CRM vs user-scoped LLM) contradicen certificación E2E y generan deuda/confusión de producto |
| **Consecuencias** | Clase `LeadScoringService` **eliminada** (2026-07-17); tabla `scored_leads` dropeada en mig **513**; clientes de `/leads` deben usar `/api/saas/lead-scoring` |
| **Evidencia** | `leadScoringDeprecatedRoute.test.ts` · KI-R015 · `513_drop_scored_leads.sql` |


## ADR-024 — Shared Memory runtime + orquestador/panel Fase 2 (sin romper certs)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-17 |
| **Decisión** | Tras MCP cert (ADR-016/017): Shared Memory runtime (mig 514, Postgres+InMemory, policy, SaaS API, MCP memory_* flag-gated). Orquestador in-memory + Panel /saas/ai + AgentRegistry + PromptRegistry. OpenClaw solo si Memory ON + flag; bridge Disabled. Flags default OFF. |
| **Por qué** | Orden ADR-017; Fase 1/certs Router+MCP intactos; fail-closed sin flags |
| **Consecuencias** | Ops habilita NELVYON_SHARED_MEMORY_ENABLED=1 tras migrate; OpenClaw bridge real pendiente URL/sandbox |
| **Evidencia** | sharedMemoryContracts + phase2Runtime + mcpProductive 23 pass · tsc 0 |

## ADR-025 — RAG unificado via facade (sin tocar Router cert)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-17 |
| **Decisión** | UnifiedRagStore (IRagStore): prefer LocalRagRetriever; fallback NelvyonRagStore. LocalModelRouter unchanged. Rollback NELVYON_RAG_PREFER_LOCAL=0. Private AI orchestrator + MCP rag_search use facade. |
| **Por qué** | Cierra KI-005 sin invalidar certificación Router/Specialization |
| **Evidencia** | PHASE2_RAG_UNIFIED.md · phase2Integration.test.ts |

## ADR-026 — Fase 2 Elite Real: sandbox-first certification

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-17 |
| **Decisión** | Excelencia de agentes se certifica primero con ejecutor sandbox determinista, eval suite sin LLM de pago, OpenClaw mock local y workflows enterprise E2E. Live Ollama + hybrid RAG in-memory (embeddings reales) eleva a `PHASE2_ELITE_CERTIFIED=true` cuando el harness v2 emite PASS. pgvector/Docker y migrate 514 quedan residuales ops (KI-016/018), no ocultan el PASS de certificación repo. |
| **Por qué** | Compilar/conectar/tests base ≠ agentes que completan trabajo empresarial validado; evita claims sin evidencia |
| **Consecuencias** | Harness `run-phase2-elite-cert.mjs` · CI siempre corre sandbox · live con `NELVYON_ELITE_LIVE=1` |
| **Evidencia** | `phase2_elite_certification.json` v2 · `phase2_elite_live.json` · `phase2EliteLive.test.ts` |

## ADR-027 — Autonomous workforce: hierarchy, aliases, ephemeral workers

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-19 |
| **Decisión** | La fuerza de trabajo permanente es el Unified Registry (Private AI + designs). OS (~1634) y Autonomous (14) permanecen stacks separados. IDs canónicos: `google_ads`, `workflows`, `reporting`, `security_compliance` — deprecar aliases `sem_google_ads`, `automation`, `analytics`, `security`. Permanentes solo con tools+workflows+evals+permisos. Subtareas → workers efímeros del orquestador (sin memoria permanente por defecto). No mintar cientos de agentes decorativos. Gate `NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED` independiente de Phase 2 Elite. |
| **Por qué** | Inventario Bloque A muestra 13 designs sin runtime, 7 agents sin eval, 4 aliases, y tool map incompleto; expandir sin consolidar multiplica deuda |
| **Consecuencias** | Bloque B añade lifecycle/hierarchy metadata; Bloque C runtime persistente; promoción de `cto`/`marketing`/etc. solo tras criterios ADR |
| **Evidencia** | `docs/AGENT_WORKFORCE_INVENTORY.md` |

---

## ADR-028 — Workforce promotions, ephemeral-only creatives, canary gates

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-19 |
| **Decisión** | Promover a Private AI runtime (con evals/tools/workflows): `cto`, `marketing`, `operations`, `devops`, `social_media`, `product`. Mantener `design` / `video` / `image` / `documentation` como **ephemeral-only** (no permanentes thin). Catálogo ~45 workflows certificados en sandbox. Mejora de prompts vía `canaryPipeline` + gates (`promotionAllowed`) — sin auto-mutate PromptRegistry prod. Cert workforce emite como máximo **CONDITIONAL_PASS** mientras existan blockers externos (Docker/pgvector, mig 514, OpenClaw, SES/Stripe) y probes skipped; `nelvyonAutonomousWorkforceCertified` permanece **false**. |
| **Por qué** | Cerrar D–G con evidencia sin fingir PASS ni crear cientos de IDs; creativos thin no merecen asiento permanente |
| **Consecuencias** | Runtime ~23; inventarios/docs actualizados; harness H no fuerza PASS; Elite PASS intacto |
| **Evidencia** | `workforceBlockDEFG.test.ts` · `workflowCatalog.ts` · `canaryPipeline.ts` · `run-workforce-cert.mjs` · `docs/AUTONOMOUS_WORKFORCE_CERT.md` |

---

## ADR-029 — Workforce PASS: evidencia completa sin force-pass

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-19 |
| **Decisión** | `NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED=true` solo si harness v2: required 10/10, skipped=0, Ollama/RAG live auto cuando reachable, OpenClaw mock certificado (URL live opcional = externalNote), production build + soak. SES/Stripe/Docker/mig514 no son blockers internos del gate workforce (van a `externalNotes`). `FORCE_PASS` → FAIL. |
| **Por qué** | CONDITIONAL era por skips/probes no ejecutados; con Ollama local disponible la evidencia live es reproducible |
| **Consecuencias** | Gate más estricto (build+live en cada cert); PASS real emitido 2026-07-19; KI-019 → R019 |
| **Evidencia** | `workforce_certification.json` · `workforcePassResiduals.test.ts` · `workforceLive.test.ts` |

---

## ADR-030 — Ingest local-ai: tsconfig dedicado (no mapear `pg` en apps/web)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-20 |
| **Decisión** | (1) **No** añadir `paths.pg` en `apps/web/tsconfig.json`. (2) Ejecutar ingest con `tsx --tsconfig scripts/tsconfig.local-ai-ingest.json` desde `nelvyon-knowledge-sync.mjs` / invocación directa. |
| **Por qué** | Mapear `pg` → `@types/pg/*.d.ts` rompe esbuild/tsx (`TransformError`). Mapear `pg` → paquete runtime sin `types` rompe `tsc` (`TS7016`). Separar configs evita ambos. |
| **Consecuencias** | `tsc` apps/web verde; ingest Brain sigue verificado con Docker+Ollama UP. Añadir `@types/pg` en workspace root si local-ai se tipa vía árbol apps/web. Router/MCP/Workforce/Elite sin cambios. |
| **Evidencia** | `knowledge_ingest_evidence.json` · `scripts/tsconfig.local-ai-ingest.json` · typecheck PASS post-revisión · `@types/pg` -w |
| **Relación** | No contradice ADR-002/004/015/024/025/029. Complementa tooling de ADR-025 (RAG) sin tocar certs. |

---

## ADR-031 — RECLASIFICADO (no es decisión arquitectónica duradera)

| Campo | Valor |
|-------|-------|
| **Fecha original** | 2026-07-20 |
| **Estado** | **Reclasificado 2026-07-20** — no se elimina el historial; deja de tratarse como ADR vinculante |
| **Motivo de reclasificación** | Documentaba una reconciliación operativa de staging (KI-022 rename `conversations`), no una decisión de arquitectura de producto. El patrón útil (“archivo `NNNa_*.sql` intercalado por orden léxico del migrator sin editar migraciones históricas”) queda en `docs/DATABASE.md` § reconciliaciones staging, no como ADR. |
| **Qué permanece válido** | ADR-002 (migraciones SQL numeradas + `migrate.ts` `.sort()`) sigue siendo la decisión arquitectónica. |
| **Evidencia operativa** | KI-022 resuelto en staging · ver `KNOWN_ISSUES` / HANDOVER |

---

## ADR-032 — Dual-plane tenant isolation (SaaS UUID vs FastAPI workspace INTEGER)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-21 |
| **Decisión** | Coexisten **dos planos** de aislamiento multi-tenant, no unificados: **(A) SaaS** — `tenant_id UUID` + RLS `nelvyon_current_saas_tenant_uuid()` (JWT/`requireSaasContext`); aplica a `saas_*`, `audit_logs`, Shared Memory. **(B/C) FastAPI** — `workspace_id INTEGER` o `tenant_id INTEGER` (= workspace) + RLS `current_tenant_id()` tras `set_tenant_context(ws)`; aplica a CDP, dialer, funnels, LMS, social unprefixed. **(D) Chatbot SaaS** — `chatbot_conversations` vía `chatbot_configs.user_id` + `nelvyon_jwt_user_id()`. Puente: `saas_tenants.workspace_id` (mig 310). |
| **Por qué** | Unificar a un solo tipo rompería FastAPI (INTEGER) o SaaS (UUID). Mig 507 mezcló planos y falló policies early (42883) / uuid≠integer en `audit_logs`. |
| **Consecuencias** | Nunca comparar UUID con `current_tenant_id()`. Tablas `saas_*` vs unprefixed FastAPI son intencionales hasta convergencia futura. Reparación operativa = mig **516** (policies aditivas; **no** editar 507). `DbClient` service_role sigue bypass RLS (defensa app-layer); RLS es defensa en profundidad para roles JWT. |
| **Relación** | Complementa ADR-002 (migraciones), ADR-024 (Shared Memory SaaS UUID), KI-026. |
| **Evidencia** | `516_fastapi_rls_repair.sql` · KI-026 audit · HANDOVER |

---

## ADR-033 — Cuatro universos de agentes (no fusionar sin ADR)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-22 |
| **Decisión** | Mantener separados: (1) Private AI registry (~23, tools+RAG, `canAutoExecute:false`); (2) Autonomous pack roles (14, Ollama-first / OpenAI opt-in); (3) OS premium (25); (4) OS sector fleet (~1605) como **legacy satellite**. Unificación operativa vía `OsCapabilityRegistry` (11 servicios) — no mintar flotilla. Dual-path LLM: ver **ADR-034**. |
| **Por qué** | Inventario `docs/OS_AGENT_TEAM_AUDIT.md` muestra stacks reales distintos; fusionar mal rompería certs / costes / honestidad. |
| **Consecuencias** | Documentar gaps con honestidad. Pagos partner y IA prod gated CEO. Sector: `mintNewSectorAgents: false`. |
| **Relación** | Complementa ADR-005/006/015/016/027/029; extendido por **ADR-034**. |

---

## ADR-034 — OS LLM dual-path (Ollama-first; OpenAI opt-in)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-22 |
| **Decisión** | `backend/os-agents/LlmClient` es dual-path: **primary Ollama** / local AI; **OpenAI** solo con `AUTONOMOUS_ALLOW_OPENAI=1` + key + PRIVATE_MODE permite egress. Sin path → `OsAgentError` (nunca mock éxito). Registry `backend/agency/OsCapabilityRegistry.ts` (11 servicios). Partners: `NELVYON_CEO_PARTNER_PAYOUTS` para dinero. |
| **Por qué** | Visión IA privada; 0 coste; unificar ejecución sin romper Router/MCP/Workforce/Elite. |
| **Consecuencias** | Contract tests dual-path; playbooks `SERVICE_*.md`; runbook `OS_AUTONOMOUS_OPERATIONS.md`. |
| **Relación** | Extiende ADR-033/005; no invalida certs. |

---

