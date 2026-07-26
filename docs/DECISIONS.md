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

## ADR-035 — MCP Productivo fail-closed (default OFF)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-22 |
| **Decisión** | `isMcpProductiveEnabled()` requiere `NELVYON_MCP_PRODUCTIVE_ENABLED=1` (antes default ON). Alineado con Shared Memory / OpenClaw / OpenAI opt-in. |
| **Por qué** | CTO deploy unify: MCP debe permanecer OFF sin flag explícito. |
| **Consecuencias** | Suite vitest opt-in en `beforeEach`; prod absente = disabled. |
| **Relación** | ADR-016 · deploy `4cb01795`. |

---

## ADR-039 — FastAPI shares web Postgres + SKIP_ALEMBIC

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-22 |
| **Decisión** | `nelvyon-app` `DATABASE_URL` = `@nelvyon/web` Postgres. Startup: `SKIP_ALEMBIC=1` (Node SQL migrations SSOT — ADR-002). Alembic non-fatal if run. `create_all` swallows **only** duplicate-table via `is_duplicate_table_error` (cause/context walk; no generic ProgrammingError). Gate: `scripts/validate-sql-alembic-ssot.mjs` (+ optional DB probe). |
| **Por qué** | Separate FastAPI DB lacked mig 517 columns; alembic `upgrade head` crashed on existing `contacts`. |
| **Evidencia** | pytest `test_create_all_duplicate_guard` 5/5 · SSOT gate ALL_PASS · prod `_migrations` 517/518 · `SKIP_ALEMBIC=1` on FastAPI |
| **Relación** | ADR-002 · ADR-038 · mig 517/518. |

---

## ADR-038 — FastAPI JWT_SECRET aligns with Next.js app JWT (bridge)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-22 |
| **Decisión** | `nelvyon-app` (FastAPI) `JWT_SECRET` **must equal** `@nelvyon/web` `JWT_SECRET` so `try_decode_nelvyon_app_token` accepts `/api/auth/login` tokens. FastAPI-native tokens keep using `JWT_SECRET_KEY` only (`core.auth`). |
| **Por qué** | Automations BFF 401: FastAPI returned `Invalid or expired authentication token` when secrets diverged (web len≠FastAPI len). |
| **Consecuencias** | Ops sync 2026-07-22 · BFF keeps fail-closed on real 401/403 · empty degraded only on upstream 5xx. |
| **Relación** | `backend/core/nelvyon_jwt.py` · platform automations unified BFF. |

---

## ADR-037 — Local Router flag fail-closed (default OFF)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-22 |
| **Decisión** | `NELVYON_LOCAL_ROUTER_ENABLED` default **OFF** (`0`). Requiere `=1` **y** `OLLAMA_CONFIGURED`. Antes el env default era `"1"` pero igual dependía de runtime; ahora explícito fail-closed alineado MCP/SM. |
| **Por qué** | Canary prep · CTO “Router local OFF por defecto”. |
| **Relación** | ADR-015 · `CANARY_IA_FLAGS.md`. |

---

## ADR-036 — Autonomous pack quality routing 3b/8b (opt-in)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-22 |
| **Decisión** | `AUTONOMOUS_QUALITY_ROUTING=1` habilita selección de modelo Ollama por rol: roles críticos de entregable usan `OLLAMA_STRATEGY_MODEL` (8b); resto `OLLAMA_MODEL` (3b). Default OFF. **No** modifica Model Router certificado ni umbral QA 85. |
| **Por qué** | Evidencia Phase C: 3b qa=55 / 8b qa=89; packs necesitan path de calidad local sin OpenAI. |
| **Consecuencias** | Tests `qualityRouting.test.ts`; prod sigue IA OFF; mesh local-AI = doc `ARCHITECTURE_LOCAL_AI_RUNTIME.md` sin activar. |
| **Relación** | ADR-034 · proposal quality routing. |

---

## ADR-040 — P0 pack E2E SKIP when LLM intentionally OFF

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-22 |
| **Decisión** | Si kickoff growth pack responde `LLM_NOT_CONFIGURED` (503) mientras IA está OFF por política, el smoke sale **exit 78** (`SKIP_IA_OFF`). El orquestador P0 cuenta SKIP como OK salvo `P0_REQUIRE_PACK_E2E=1`. portal-packs sigue siendo blocking. |
| **Por qué** | Evitar falso FAIL de CI cuando CEO mantiene IA OFF; evitar falso PASS/mock. |
| **Consecuencias** | `scripts/lib/p0-llm-skip.mjs` · `run-staging-p0-smokes.mjs` imprime `ALL_P0_PASS_WITH_IA_OFF_SKIPS`. |
| **Relación** | ADR-036/037 · canary IA. |

---

## ADR-041 — CEO staging canary Router + Quality Routing (no prod, no OpenAI)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-23 |
| **Decisión** | Tras aprobación CEO: en Railway **staging** `ideal-victory` se setean `NELVYON_LOCAL_ROUTER_ENABLED=1` + `AUTONOMOUS_QUALITY_ROUTING=1` + modelos 3b/8b. **Prod** permanece con keys IA ABSENT. `NELVYON_AI_ENABLED=0` y `OLLAMA_CONFIGURED=0` en staging hasta mesh Option A. OpenAI allow **0**. Prueba real Option C local (`staging-canary-router-qr-local-probe.mjs`) = evidencia. |
| **Por qué** | Probar routing sin coste ni OpenAI ni tocar producción; sin mesh no inventar inferencia remota PASS. |
| **Consecuencias** | Inferencia Railway staging **BLOCKED_UNTIL_MESH**. Rollback = flags `0`. Docs `CEO_IA_STAGING_APPROVAL_REQUEST` firmado. |
| **Relación** | ADR-036/037/040 · `ARCHITECTURE_LOCAL_AI_RUNTIME.md`. |

---

## ADR-042 — Mesh Option A staging (Tailscale → Ollama local)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-23 |
| **Decisión** | CEO autoriza Mesh Option A **solo staging**: Ollama escucha en IP Tailscale (no pública); `OLLAMA_HOST` allowlist CGNAT/`*.ts.net`; entrypoint opcional `railway-mesh-option-a-entrypoint.sh` si `NELVYON_MESH_OPTION_A=1` + `TS_AUTHKEY`; prod sin keys mesh; sin Funnel/Serve/exit/subnet. |
| **Por qué** | Railway no alcanza `100.x` sin nodo Tailscale; auth key solo vía UI CEO (nunca chat). |
| **Consecuencias** | Local private PASS; Railway join requiere `TS_AUTHKEY` válida (`tskey-auth-`); entrypoint setea proxies **solo** tras `MESH_JOIN_OK`; rollback emergencia `NELVYON_AI_ENABLED=0` + `OLLAMA_CONFIGURED=0`. |
| **Relación** | ADR-041 · `ARCHITECTURE_LOCAL_AI_RUNTIME.md` · `MESH_OPTION_A_STAGING.md`. |

---

## ADR-043 — Staging mesh proxies only after successful Tailscale up

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-23 |
| **Decisión** | Si `tailscale up` falla (p.ej. auth key inválida), **no** exportar `ALL_PROXY`/`HTTP_PROXY`. Log `MESH_JOIN_FAIL` redactado. App arranca; Ollama remoto fail-closed. |
| **Por qué** | Proxies SOCKS rotos degradan outbound y ocultan la causa real. |
| **Consecuencias** | `railway-mesh-option-a-entrypoint.sh` actualizado; verify documenta join FAIL honesto. |
| **Relación** | ADR-042. |

---

## ADR-044 — PRIVATE_MODE CGNAT allowlist + mesh HTTP proxy fetch

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-23 |
| **Decisión** | Allowlist PRIVATE_MODE incluye Tailscale CGNAT `100.64.0.0/10` y `*.ts.net`. `OLLAMA_HOST` puede ser IP Tailscale. Con `NELVYON_MESH_OPTION_A=1`, `privateModeFetch` usa proxy HTTP local (`NELVYON_MESH_HTTP_PROXY` / `HTTP_PROXY`) vía Node `http` absolute-form (**http:// only**, sin undici). Entrypoint setea proxies solo si `mesh_ok=1`. |
| **Por qué** | Railway userspace Tailscale no enruta CGNAT sin HTTP/SOCKS proxy; Node fetch nativo ignora `HTTP_PROXY`. |
| **Consecuencias** | tip `1d5d620a` build PASS; mesh join sigue requiriendo `TS_AUTHKEY` válida por redeploy (ephemeral); HTTPS mesh no soportado en proxy helper. |
| **Relación** | ADR-042 · ADR-043 · `privateMode.ts` · `railway-mesh-option-a-entrypoint.sh`. |

---

## ADR-045 — Pack kickoff async (HTTP 202) for mesh/Ollama

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-23 |
| **Decisión** | Kickoff OS packs responde **202** tras `createPackRun` (`onRunCreated`) y continúa SKUs/LLM en el event loop del proceso Node (Railway). Sync solo con `X-Pack-Sync: 1` o `NELVYON_PACK_KICKOFF_ASYNC=0`. Idempotency insert usa `ON CONFLICT (workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL`. Entrypoint mesh scripts force LF (`.gitattributes`). Si Ollama está configurado y falla, **no** silent-mock. |
| **Por qué** | Packs 8B vía mesh superan `maxDuration`/gateway; abort del cliente dejaba runs `running` forever. |
| **Consecuencias** | Smoke acepta 202 + poll largo; Pack E2E mesh `f5de9c43` → `needs_review` con LLM real. |
| **Relación** | ADR-044 · `kickoff/route.ts` · `packOrchestrator.ts` · `llmAdapter.ts`. |

---

## ADR-046 — SEO mesh QA: deterministic plan + keyword pad + JSON repair

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | (1) `normalizeSeoPlan` ignora blockers inventados por LLM y usa blockers deterministas del brief. (2) `normalizeKeywordsArtifact` rellena a ≥10 keywords. (3) `parseJsonFromLlm` tolera trailing commas; Ollama hace **1** repair retry. (4) Agentes SEO intermedios soft-continue ante fallo JSON; `generateSeoPackIsolated` sigue siendo SSOT de artefactos QA. Sin silent-mock mode cuando Ollama está configurado. |
| **Por qué** | Pack E2E fallaba SEO QA~65 (abort por blockers LLM / keywords thin) o abort hard por JSON inválido del copywriter aunque el pack aislado sobrescribe on_page. |
| **Consecuencias** | tip `99b30730` · Pack E2E staging **completed** ALL_PASS · 5 auto-approve. |
| **Relación** | ADR-045 · `seoGenerator.ts` · `runPipelinePhaseC.ts` · `llmAdapter.ts` · `parseJson.ts`. |

---

## ADR-047 — OS Universal catalog + free-tools research gate

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | (1) `docs/OS_UNIVERSAL_SERVICE_CATALOG.md` es SSOT de estado real OS (`IMPLEMENTED_VERIFIED`/`BETA`/`PREPARED_OFF`/`BLOCKED_EXTERNAL`/`NOT_IMPLEMENTED`). (2) `docs/FREE_TOOLS_EVALUATION.md` documenta investigación OSS; **prohibido** instalar sin ADR específico + aprobación CTO. (3) No promover beta→available sin evidencia `SERVICE_BETA_PACKS.md`. (4) No declarar READY mientras legal campañas bloquee claimReady. |
| **Por qué** | Evitar humo (AVAILABLE por UI) y deuda de tools freemium/duplicadas. |
| **Consecuencias** | Fase A = certificar ecommerce/saas-b2b E2E; tools = DEFER/REJECT salvo propuesta analytics. |
| **Relación** | `OsCapabilityRegistry.ts` · packRegistry · MESH ADR-042–046. |

---

## ADR-049 — Certificar growth packs + Strategy/Funnel/Retention OS

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | (1) Certificar `ecommerce-growth` y `saas-b2b-growth` con mismo estándar que local (mesh, brief real, QA≥85, portal, auto-approve, completed). (2) Registry: `ecommerce` + `crm_sales` → **elite** tras E2E ALL_PASS. (3) Auditoría 5 betas: **permanecen BETA** (mapper genérico / sin ALL_PASS). (4) Construir `strategy-pack` · `funnel-growth-pack` · `retention-pack` con mappers dedicados, playbooks, flags `NELVYON_*_PACK` default OFF fuera staging, catalog `beta` hasta E2E. (5) Soft-continue en `llmPmSeo` para no dejar `sku_seo:running` eterno. (6) **0** tools nuevas · prod IA OFF · claimReady false. |
| **Por qué** | Expandir OS sin humo ni costes; reutilizar SKUs autónomos. |
| **Consecuencias** | Catálogo 14 capabilities · smoke `staging-smoke-new-os-packs-e2e.mjs` · promote nuevos packs solo tras ALL_PASS. |
| **Relación** | ADR-047 · `OS_NEW_SERVICES_CONTRACTS.md` · `OS_UNIVERSAL_SERVICE_CATALOG.md`. |

---

## ADR-048 — REJECT/DEFER Matomo y Umami

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | **No instalar** Matomo ni Umami. Mantener analítica NELVYON (GA4 + Search Console vía `analytics-setup-pack`). Reevaluar solo si aparece brecha demostrada. |
| **Por qué** | Evitar duplicidad, mantenimiento y costes; analytics-setup entrega checklist/event map/dashboard sin infra nueva. |
| **Consecuencias** | 0 installs · FREE_TOOLS_EVALUATION actualizado · sin puertos públicos · coste 0. |
| **Relación** | ADR-047 · `analytics-setup-pack` · `FREE_TOOLS_EVALUATION.md`. |

---

## ADR-050 — Certificar 5 packs (social/content/cro/analytics/brand)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | Sustituir mapper genérico por mappers dedicados (`betaPackProduction.ts`) + entregables específicos + playbooks. E2E mesh staging obligatorio (QA≥85, portal, auto-approve, completed). Promote a `available` / IMPLEMENTED_VERIFIED **solo** con ALL_PASS. Prod IA OFF. |
| **Por qué** | Cerrar deuda beta sin humo ni tools nuevas. |
| **Consecuencias** | Smoke `staging-smoke-beta-packs-e2e.mjs` · catálogo honestidad. |
| **Relación** | ADR-048 · ADR-049 · `SERVICE_BETA_PACKS.md`. |

---

## ADR-051 — OS Elite: equipos profesionales, orquestador, OpenClaw OFF, QA élite, Visual OFF

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | (1) Catálogo `OsProfessionalTeams` (globales + especialistas). (2) Flujo `OS_DELIVERABLE_FLOW`. (3) `OsEliteQaPolicy` ≥85 / críticos ≥90. (4) Auditor independiente flag default OFF. (5) Orquestación + OpenClaw coordination fail-closed OFF. (6) `VisualGenerationProvider` OFF sin gasto. (7) No tocar packs certificados ni umbrales. (8) Matriz `OS_ELITE_STATE_MATRIX.md`. |
| **Por qué** | Agencia autónoma de calidad demostrable sin costes ni mocks. |
| **Consecuencias** | OpenClaw/orchestrator/visual/auditor = PREPARED_OFF · claimReady BLOCKED_LEGAL. |
| **Relación** | ADR-045–050 · `packOrchestrator` hook opcional · openclaw/contracts. |

---

## ADR-054 — Cierre 6 puntos: packs+auditor, visual élite, social oficial, legal técnico

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | (1) E2E **11 packs** certificados con auditor staging ON. (2) OpenClaw staging_mock con `teamAssignments`. (3) Catalog v1.1.0 roles/flow/criteria. (4) `NelvyonOfficialSocialPrep` + checklist CEO 8 cuentas sin publish. (5) `VisualEliteStrategyPipeline` strategy_only · spend OFF. (6) `CampaignsLegalTechnicalGate` técnico completo · `claimReadyLegal` hard-false · Pepito forbidden · LEGAL BLOCKED sin licencia escrita. |
| **Por qué** | Cerrar verde real verificable sin READY falso. |
| **Evidencia** | tip `980ea216` · deploy `23f637b9` · `auditor.all_packs_e2e_latest.md` · agency 43/43 |
| **Relación** | ADR-051–053 · `OS_CATALOG_V1.md` |

---

## ADR-053 — Auditor independiente staging + OpenClaw staging_mock + OS Catalog v1

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | (1) `NELVYON_PACK_INDEPENDENT_AUDITOR=1` **solo staging** · sesiones approve/reject/repair con evidencia · E2E PASS/REJECT/repair/PASS. (2) OpenClaw **staging_mock** via `NELVYON_OPENCLAW_BRIDGE_ENABLED=1` + `NELVYON_OPENCLAW_STAGING_MODE=1` sin SM productiva · coordinación fail-closed (tenant, permisos, retries, idempotencia, timeout, rollback). (3) Catálogo versionado `OS_CATALOG_V1` / `docs/OS_CATALOG_V1.md` — sin “servicios futuros” ambiguos. (4) Prod OpenClaw/auditor/SM/MCP/OpenAI/payouts OFF sin nueva autorización CEO. |
| **Por qué** | Cerrar verde real OS en staging sin coste ni riesgo prod. |
| **Consecuencias** | Matriz elite + SSOT actualizados · claimReady false. |
| **Relación** | ADR-051 · ADR-052 · `OsIndependentAuditSession` · `OpenClawStagingCoordinator` · `OsCatalogV1`. |

---

## ADR-052 — Redes sociales completas por cliente (integral social OS)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | (1) `OsSocialNetworksService` SSOT de plataformas (11), roles (10), flujo obligatorio y bundle integral. (2) Ampliar `social-calendar-pack` con entregables estrategia / kit multi-red / CM+paid OFF (portal-visible). (3) Paid social + OAuth + publish **fail-closed** (`PREPARED_OFF` / `NOT_AUTHORIZED`). (4) Equipo `svc_social_creative` con roster completo. (5) Re-certificar pack con smoke `--only=social` tras deploy; no bajar QA; sin gasto visual/ads. |
| **Por qué** | Servicio social integral demostrable sin publicar ni gastar sin autorización. |
| **Consecuencias** | Playbook `SERVICE_CONTENT_SOCIAL.md` · tests unitarios · E2E staging `--only=social` **ALL_PASS** 2026-07-24 · tip `4d331b55` · deploy `85fe50cc` · matriz elite actualizada · claimReady sigue false. |
| **Relación** | ADR-050 · ADR-051 · pack `social-calendar-pack`. |

---

## ADR-055 — Automations/reputation packs, social ops, SM/MCP synthetic, legal Pepito

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | (1) Wire `automations-ops-pack` + `reputation-ops-pack` (beta, flags default OFF) con runners/mappers/kickoff. (2) Catalog **v1.2.0** — kickoffPackIds automations/reputation. (3) `NelvyonOfficialSocialOps` + checklist CEO — **PREPARED_OFF**, sin OAuth/publish. (4) `StagingSharedMemoryMcpHarness` — flags `NELVYON_SHARED_MEMORY_STAGING` + `NELVYON_MCP_STAGING_SYNTHETIC` staging-only; productivo SM/MCP **0**. (5) OpenClaw staging deepened + `CEO_OPENCLAW_PROD_CANARY_REQUEST.md` **PENDING_CEO**. (6) Visual `creative_direction` + `VISUAL_PROVIDER_DECISION_MATRIX` · spend OFF. (7) `CampaignsLegalTechnicalGate` reforzado + `DATOS_PEPITO_LICENSE_DOSSIER` · `claimReadyLegal` hard-false · Pepito **forbidden**. |
| **Por qué** | Cerrar wiring local verificable sin READY falso ni coste prod. |
| **Evidencia** | tip **`53149384`** · deploy **`e514bbd7`** SUCCESS · E2E `automations-ops-pack`+`reputation-ops-pack` **ALL_PASS** (6 entregables/pack · auto-approve) · `automations_reputation_e2e_latest.md` · agency **64+ PASS** · tsc **0** · SM/MCP synthetic flags **ON** staging · productivo **0** · harness unit tests PASS |
| **Consecuencias** | Catalog: automations · reputation · sm_mcp_synthetic_staging → **IMPLEMENTED_VERIFIED (staging)** · `claimReady: false` · **NOT READY** · prod untouched · no OpenAI/payouts/campaigns/visual spend/OpenClaw prod. |
| **Relación** | ADR-051–054 · `OsCatalogV1` · `automationsReputationPacksRunners` · `NelvyonOfficialSocialOps`. |

---

## ADR-056 — Elite absolute audit (P0/P1 honesty fixes)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | (1) **P0:** Block campaign mass-send via `getCampaignLaunchBlockReason` while `claimReadyLegal=false` (test bypass only). (2) **P1:** Gate chat+ai-copy spend with `isOpenAiSpendAllowed`; stop inventing `mcp.write`; split shared-memory scopes; demote `meta-ads-pack` to beta **OAuth OFF**. (3) Prod flag read: confirm `NELVYON_*` OpenAI/MCP/SM/OpenClaw/visual vars **ABSENT** (default OFF) — Railway briefly switched, restored to staging. (4) No READY · no competitive superiority claims · Pepito untouched. |
| **Por qué** | Close demonstrable P0/P1 honesty gaps without false READY or prod activation. |
| **Evidencia** | base tip **`6364c28c`** · fixes **uncommitted** (tip TBA pending parent push) · runtime staging still ADR-055 **`53149384`** · tsc **0** · CampaignsLegal+saasCampanias+saasEnv+mcpProductive+catalog availability **PASS** · agency **109 PASS** · eslint changed routes **0** · staging `ideal-victory` Online · `OLLAMA_HOST=http://100.102.207.30:11434` (Tailscale CGNAT private) · `AUTONOMOUS_ALLOW_OPENAI=0` · MCP/SM productivo=0 · VISUAL=0 · `AI_ENABLED=1` staging only |
| **Consecuencias** | **AUDIT_FIXES_LOCAL** · **CONDITIONAL_READY** · **NOT READY** · `claimReady: false` · competitive honesty gaps documented (no Meta/Google Ads OAuth spend path · no GHL telephony dialer parity · no Odoo ERP/accounting/manufacturing · campaign mass-send legally blocked · official social accounts pending CEO · no proven multi-tenant production customer outcomes in this audit). |
| **Relación** | ADR-055 · `CampaignsLegalTechnicalGate` · `SaasCampaniasService` · `SaasMcpProductiveService` · shared-memory routes · `servicePacksCatalog`. |

---

## ADR-057 — Blocks 11–25 internal cores (agency platform completion)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-24 |
| **Decisión** | Cerrar **Blocks 11–25** como cores internos verificados con honestidad fail-closed. Sin activar rutas externas de pago, OAuth real, publish real, telefonía real, App Store, pgvector live ni canary productivo de IA. Catalog bump **OsCatalogV1 v1.4.0**. |
| **Blocks** | **11** `TelephonyCore` simulator IMPLEMENTED_VERIFIED · real **BLOCKED_EXTERNAL** · **12** `influencers-pr-pack` PREPARED_OFF/beta (unit+kickoff wired) · **13** `AdsAttributionCore` IMPLEMENTED_VERIFIED · spend/OAuth **BLOCKED_EXTERNAL** · **14** `CommunityPublishCore` simulator IMPLEMENTED_VERIFIED · publish **BLOCKED_EXTERNAL** · **15** `MassSendTechnicalControls` IMPLEMENTED_VERIFIED · send **BLOCKED_LEGAL** · **16** `OAuthMultiTenantFramework` mock IMPLEMENTED_VERIFIED · real apps **BLOCKED_EXTERNAL** · **17** `IntegrationsMarketplaceV1` internal ping IMPLEMENTED_VERIFIED · **18** mobile Capacitor PREPARED_OFF/contract VERIFIED · stores **BLOCKED_EXTERNAL** · **19** PWA IMPLEMENTED_VERIFIED (`pwa-certify`) · iOS **PARTIAL** · **20** `LocalizationCore` es/en IMPLEMENTED_VERIFIED · fr/de/it/pt **PARTIAL** · **21** HA/DR runbook IMPLEMENTED_VERIFIED · multi-region **BLOCKED_EXTERNAL** · **22** `OpsObservabilityCore` local IMPLEMENTED_VERIFIED · paid **PREPARED_OFF** · **23** `LegacyConsolidationAudit` IMPLEMENTED_VERIFIED · zero unsafe deletes · **24** `PrivateVectorRagCore` synthetic IMPLEMENTED_VERIFIED · pgvector **PREPARED_OFF** · **25** `PrivateAiCanaryPrep` PREPARED_OFF · **BLOCKED_CEO** |
| **Por qué** | Completar la capa agency/OS con cores demostrables sin false READY ni activación productiva. Separar “core verificado” de “integración externa pendiente CEO/legal”. |
| **Evidencia** | `tsc` **0** · `vitest run backend/agency` **249 PASS** · influencers pack tests **PASS** · `pwa-certify` **PASS** (`pwa.cert_latest.md`) · private-rag synthetic **ALL_PASS** (27 tests · `private-rag.synthetic_latest.md`) · staging https://ideal-victory-staging.up.railway.app · prod flags **OFF** |
| **Consecuencias** | **CONDITIONAL_READY** · **NOT READY** · `claimReady: false` · tip **TBA** (parent commit pending) · próximo paso: CEO checklists + confirm staging deploy after push · sin OpenAI · sin Pepito · sin credenciales reales Twilio/ads/publish/OAuth · sin App Store publish |
| **Relación** | ADR-056 · `OsCatalogV1.ts` · runbooks `docs/ops/*` · `CEO_IA_PROD_CANARY_REQUEST.md` · `PRIVATE_RAG_RUNBOOK.md` |

---

## ADR-057.1 — Block 24 follow-up: pgvector RAG live e2e ("yellow point 7")

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-25 |
| **Decisión** | Promover `PrivateVectorRagCore.PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath` de `PREPARED_OFF` a `IMPLEMENTED_VERIFIED` **solo** tras verificación EN VIVO real contra Docker `pgvector/pgvector:pg16` (ya corriendo en la máquina del owner) y Ollama real (`nomic-embed-text`, mesh Tailscale). La promoción exige evidencia + timestamp committeados y un guard de integridad (`assertPrivateVectorRagCoreIntegrity`) que ahora falla si se intenta marcar `IMPLEMENTED_VERIFIED` sin esos dos campos — hace estructuralmente imposible una promoción "fake green" en el futuro. |
| **Hallazgo honesto** | Con embeddings REALES, la similitud coseno entre frases reales no relacionadas no es cercana a 0 (propiedad geométrica del embedding, no un bug). El `minScore=0.32` por defecto — calibrado contra el corpus real grande de 18 dominios — no rechaza de forma fiable una query irrelevante contra un corpus de tenant sintético muy pequeño (2–4 chunks). Un diagnóstico con `minScore=0.55` sobre la misma query confirma que es un ajuste de umbral (no fabricación): sin fuga cross-tenant, sin contenido inventado en ningún caso — las citas devueltas son siempre reales, solo débilmente relevantes. Se decidió **no** cambiar el default compartido sin re-benchmarkear contra `specialization_eval_*.json`; se documentó como P2 en `docs/KNOWN_ISSUES.md` en vez de ocultarlo o forzar un PASS artificial. |
| **Por qué** | Cumplir el mandato "no fake green": promover solo si la infraestructura productiva real funciona, y documentar explícitamente cualquier gap encontrado en el camino en lugar de manipular el test hasta que pase. |
| **Evidencia** | `scripts/staging-smoke-pgvector-rag-e2e.mjs` → `scripts/docs/evidence/os-saas-e2e/modules/pgvector-rag.live_latest.md` (11/13 checks críticos+calidad PASS, verdict `PASS_WITH_KNOWN_GAP`) · `vitest run backend/agency/__tests__/PrivateVectorRagCore.test.ts` **27/27 PASS** · `vitest run backend/agency` **305/305 PASS** · `tsc --noEmit` **0** |
| **Consecuencias** | `OsCatalogV1.private_vector_rag.nextAction`/`e2eEvidence` actualizados · staging permanece **PREPARED_OFF** (no se activó ni solicitó Postgres+pgvector en Railway ni mesh Ollama — ver `CEO_IA_STAGING_APPROVAL_REQUEST.md`) · sin activación en producción · sin OpenAI · sin Pepito · `NELVYON_LOCAL_ROUTER_ENABLED` sin tocar |
| **Relación** | ADR-057 · `PrivateVectorRagCore.ts` · `PRIVATE_RAG_RUNBOOK.md` · `docs/KNOWN_ISSUES.md` |

---
---

## ADR-058 — Chatbot Phase C: ignore invented LLM blockers + soft-continue

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-25 |
| **Decisión** | (1) `normalizeChatbotPlan` merges Ollama PM output with deterministic `runPmChatbot` blockers — invented blockers never abort a complete pack brief. (2) Soft-continue on PM/strategist/copywriter LLM failures with brief-derived KB via `normalizeChatbotKnowledgeBase`. (3) `runChatbotConfig` tolerates missing `handoff`. Same class as ADR-046 SEO. QA floor ≥85 unchanged; no silent-mock success when Ollama configured. |
| **Por qué** | Staging influencers-pr E2E: `sku_chatbot` **QA 30 — escalado** → `needs_review` despite pack deliverables OK (`influencers_pr:done`). |
| **Consecuencias** | Mesh chatbot packs (automations/reputation/influencers) resilient to invented blockers. Promote `influencers_pr` only after staging E2E ALL_PASS post-deploy. |
| **Relación** | ADR-046 · `runPipelinePhaseC.ts` · `chatbotKbNormalize.ts` · `meshQaFixes.test.ts`. |

---

## ADR-059 — Catalog v1.6.0 ads/community promote + email locale PARTIAL + Android scaffold

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-25 |
| **Decisión** | (1) OsCatalogV1 bump **v1.6.0** — promote `ads_attribution_core` + `community_publish_core` to **IMPLEMENTED_VERIFIED** on unit/core evidence (mismo patrón que `telephony_core`); OAuth/spend/publish real permanecen **BLOCKED_EXTERNAL**. (2) Email locale expand (Resend invoice/job/onboarding + SES payment_failed/cancellation es/en/fr/de/it/pt) se documenta como **PARTIAL** — no FULL_VERIFIED hasta auditoría SES catalog restante + `billing/*EmailTemplates`. PDF labels **PARTIAL**. UI catalogs fr/de/it/pt **FULL**. (3) Android Capacitor scaffold en `apps/mobile/android/` documentado como presente; APK `assembleDebug` **BLOCKED_EXTERNAL** hasta JDK/Android SDK. (4) Observability drill + legacy consolidation evidence escritas; HA single-region **VERIFIED**; multi-region **BLOCKED_EXTERNAL/COST**. (5) Sin OAuth real, sin spend, sin publish real, sin App Store/Play green, sin claimReady. |
| **Por qué** | Cierre interno honestidad: promover solo cores demostrables; separar UI i18n FULL de email/PDF PARTIAL; no inventar verde móvil ni multi-región. |
| **Evidencia** | Staging tip **`5adbfcd2`** · deploy **`d5caafc0` SUCCESS** · `AUTONOMOUS_ALLOW_OPENAI=0` · catalog v1.6.0 (local tip post-commit) · `mobile.android_scaffold.md` · `observability.drill_latest.md` · `legacy.consolidation_latest.md` · `ha-dr-readiness_latest.md` · influencers E2E prior VERIFIED · private_vector_rag Docker VERIFIED / Railway **PREPARED_OFF** · private_ai_canary **PREPARED_OFF+BLOCKED_CEO** |
| **Consecuencias** | **CONDITIONAL_READY** · **NOT READY** · `claimReady: false` · email/PDF **PARTIAL** · Android **local build VERIFIED** · device/iOS/Play **BLOCKED_EXTERNAL** · multi-region **BLOCKED_EXTERNAL/COST** · próximos pasos = acciones solo Daniel en HANDOVER |
| **Relación** | ADR-057 · ADR-058 · `OsCatalogV1.ts` · `LocalizationCore` · `MobileAppContract` · `AdsAttributionCore` · `CommunityPublishCore` |

---

## ADR-060 — ERP non-financial cores (catalog v1.7.0 · Blocks 26–29 + 35)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-25 |
| **Decisión** | (1) Wire `PurchasesSuppliersCore`, `InventoryWarehousesCore`, `ManufacturingOpsCore`, `ProjectsFieldServiceCore`, `SectorCapabilityTaxonomy` into product surface: export from `backend/agency/index.ts`, OsCatalogV1 bump **v1.7.0** with status **IMPLEMENTED_VERIFIED** on unit + synthetic smoke evidence (mismo patrón honestidad que `telephony_core` — in-memory / process-local). (2) API `/api/saas/erp/{purchases,inventory,manufacturing,projects-fs,sectors}` + UI `/saas/erp/*` + sidebar — sin mocks silenciosos. (3) Migration **`519_erp_non_financial_cores.sql`** **reserva schema** durable (suppliers/PO/inventory/warehouses/stock_moves/MO/`saas_projects_erp`); **runtime SSOT permanece in-memory** hasta dual-write explícito — **no** claim DB SSOT. (4) Payments / bank / tax / GL / cost accounting = **BLOCKED_SCOPE**; IoT = **BLOCKED_EXTERNAL**; e-signature = **BLOCKED_EXTERNAL**; regulated health sector = **BLOCKED_LEGAL**; industry sector = **PREPARED_OFF** hasta pack dedicado. (5) **No Odoo**, **no** full ERP/accounting/finance. (6) Tip **uncommitted** hasta commit del parent; staging live tip **`bd165985`** aún sin v1.7.0/519. (7) `claimReady` sigue **false** · **NOT READY**. |
| **Por qué** | Ampliar OS/SaaS con cores operativos no financieros demostrables sin inventar contabilidad, pagos, IoT, firma electrónica, salud regulada ni paridad Odoo; separar schema reserved de SSOT runtime. |
| **Evidencia** | `scripts/docs/evidence/os-saas-e2e/modules/erp.cores_synthetic_latest.md` **ALL_PASS** · vitest agency cores PASS · OsCatalogV1Closure espera v1.7.0 · smoke `staging-smoke-erp-cores.mjs` · playbooks `SERVICE_PURCHASES_SUPPLIERS` / `SERVICE_INVENTORY_WAREHOUSES` / `SERVICE_MANUFACTURING_OPS` / `SERVICE_PROJECTS_FIELD_SERVICE` / `SECTOR_TAXONOMY_CANONICAL` |
| **Consecuencias** | **CONDITIONAL_READY** · **NOT READY** · `claimReady: false` · (superseded on SSOT by **ADR-061**) ERP was process-local until Postgres snapshot path · mig 519 deploy pendiente con tip |
| **Relación** | ADR-057 · ADR-059 · ADR-061 · `OsCatalogV1.ts` · `backend/agency/*Core.ts` · `519_erp_non_financial_cores.sql` · `/saas/erp/*` |

---

## ADR-061 — Postgres ERP SSOT (`erp_domain_snapshots` · mig 520 · API `with*Persistence`)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-25 |
| **Decisión** | (1) **Runtime SSOT** for ERP Blocks 26–29 is **Postgres** table `erp_domain_snapshots` when `DATABASE_URL` is set — **process-memory is no longer SSOT** in that mode. (2) Migration **`520_erp_postgres_persistence.sql`** creates `erp_domain_snapshots` (tenant_id+domain PK, JSONB payload, optimistic `version`) + `erp_audit_events` + RLS helpers; migration **`519_erp_non_financial_cores.sql`** remains **schema reserved** for relational companions (not required for first durable path). (3) API routes `/api/saas/erp/{purchases,inventory,manufacturing,projects-fs}` **must** use `with*Persistence` (`ErpPersistentRuntime`) — hydrate/save via `ErpDomainSnapshotStore`; version conflict → HTTP **409** (`ErpSnapshotConflictError`). (4) Without `DATABASE_URL`, in-memory fallback remains (dev/tests only) — never claim durable without DB. (5) **No** claim live on staging until tip commit + migrate applies **519+520** + restart smoke `staging-smoke-erp-persistence.mjs` (`--phase=before|after`) **ALL_PASS**. (6) Payments / bank / tax / GL / cost = **BLOCKED_SCOPE**; IoT / e-signature = **BLOCKED_EXTERNAL**; health = **BLOCKED_LEGAL**; **no Odoo**. (7) `claimReady` remains **false** · **NOT READY**. |
| **Por qué** | Cerrar el riesgo P0 de pérdida de datos ERP al reiniciar el proceso: el SSOT in-memory de ADR-060 era honestidad de producto, no durabilidad. Snapshot JSONB + version optimista es el primer camino durable sin dual-write relacional completo. |
| **Evidencia staging** | tip **`9e931f08`** · deploy **`86c93c8c`** + recycle **`794662d7`** · `_migrations` **519+520** · `erp.persistence_restart_latest.md` **ALL_PASS** · DB row purchases v3 · RLS on · vitest ERP **49 PASS / 2 skip** |
| **Consecuencias** | Staging durable VERIFIED · prod ERP migrate **blocked** until explicit CTO go-ahead · relational dual-write (519 companions) optional · **CONDITIONAL_READY** · **NOT READY** · `claimReady: false` |
| **Relación** | ADR-060 · `520_erp_postgres_persistence.sql` · `519_erp_non_financial_cores.sql` · `backend/agency/erp/*` · `/api/saas/erp/*` |

---

## ADR-062 — ERP relational dual-write (519 companions) PREPARED_OFF

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-25 |
| **Estado** | **PREPARED_OFF** — diseño + plan + flag helpers; dual-write **no** live; read path **no** flipped |
| **Relación** | ADR-061 (snapshot SSOT) · mig **519** reserved · mig **520** snapshots+companions+RLS · runbook `docs/ops/ERP_DUAL_WRITE_TRANSITION_RUNBOOK.md` |
| **Flags** | `NELVYON_ERP_RELATIONAL_DUAL_WRITE` / `NELVYON_ERP_RELATIONAL_READ` — default **0** (fail-closed); **cutover REQUIRES CEO** |

### Decisión

Mantener **`erp_domain_snapshots` (JSONB + optimistic `version` + `FOR UPDATE`)** como **SSOT runtime** de Blocks 26–29 (`purchases` \| `inventory` \| `manufacturing` \| `projects_fs`) vía `ErpDomainSnapshotStore` / `ErpPersistentRuntime.with*Persistence`.

Tablas companion **519/520** = schema **reservado / aditivo**. **No** son path de lectura/escritura de `/api/saas/erp/*` hoy. **No** afirmar dual-write activo.

### Auditoría del modelo JSONB actual (520)

| Dimensión | Fortaleza | Límite |
|-----------|-----------|--------|
| **Durabilidad** | 1 fila/(tenant,domain); overvive restart; ADR-061 VERIFIED staging | Payload crece O(entidades); riesgo tamaño/TOAST/latencia |
| **Concurrencia** | `FOR UPDATE` + version check → `ErpSnapshotConflictError` → HTTP 409 | Contención **por dominio entero** (no por entidad) |
| **Multi-réplica app** | SSOT en Postgres: N réplicas OK | Lock row-level serializa mutaciones del dominio |
| **Queryabilidad** | Export/import core atómico | Sin SQL por SKU/PO/MO; reportes = full deserialize |
| **Índices** | PK `(tenant_id,domain)` + `updated_at` | No GIN/partial sobre entidades internas |
| **Integridad** | Version + tx única hydrate→mutate→save | FKs/constraints de negocio **no** en DB |
| **RLS** | `app.tenant_id` GUC + policies FORCE | Service role bypass → app **debe** filtrar `tenant_id` |
| **Rollback** | Redeploy tip previo; tablas aditivas inocuas | Corrupción snapshot → PITR |

### Plan de transición (exacto — no ejecutado)

| Fase | Acción | Flags | Gate |
|------|--------|-------|------|
| **0 PREP** | Helpers fail-closed + tests unit (sin DDL) | ambos `0` | vitest `erpDualWritePrep` PASS · runbook |
| **1 SCHEMA** | Mig **aditiva `521+`** (solo ADD; **nunca** DROP snapshots) | ambos `0` | migrate staging · CEO **no** cutover |
| **2 DUAL_WRITE** | Mirror tras `saveSnapshotLocked` | `DUAL_WRITE=1` `READ=0` | 0 drift · 409 · smoke A/B |
| **3 BACKFILL** | Job idempotente + checksum | `DUAL_WRITE=1` `READ=0` | checksum **100%** |
| **4 READ_FLIP** | Lecturas relacionales | ambos `1` | smokes + **CEO SÍ escrito** |
| **5 ROLLBACK** | Flags → `0` | ambos `0` | snapshot-only ADR-061 |

**Cutover (fase 4) = decisión CEO.** Sin firma → **PREPARED_OFF**.

### Criterio / consecuencias

Sin dual-write live + backfill + read flip + smokes + CEO → **PREPARED_OFF**.  
Prep 2026-07-25: `erpRelationalFlags.ts` + `erpDualWritePrep.test.ts` + runbook.  
`claimReady: false` · **NOT READY**.

---

## ADR-063 — Prod auto-deploy migrate vs CEO ERP gate (governance)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-25 |
| **Decisión** | Documentar que Railway production `@nelvyon/web` `preDeployCommand` = `migrate:prod` aplica SQL nuevos en cada deploy de `main`. ERP 519/520 quedaron **applied** sin firma CEO en runbook. |
| **Por qué** | Honestidad operativa: no afirmar “prod sin 519/520” tras skip en logs. |
| **Consecuencias** | Runbook pasa a **ack CEO / política auto-deploy**; schema aditivo ya live; `claimReady` sigue false; considerar manual promote. |
| **Evidencia** | deploy `05abdfa7` migrate skip 519/520 · tip prod `5a36809c` |

---

## ADR-064 — Production migrate gate (CEO-auditable, fail-closed)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-25 |
| **Decisión** | `migrate:prod` **y** `migrate.ts` en producción **no aplican** SQL pendientes sin `NELVYON_PROD_MIGRATE_APPROVED=1` + `NELVYON_PROD_MIGRATE_APPROVED_BY`. Pending sin approval → **exit 1**. Pending=0 → no-op exit 0. Staging sigue auto-apply. |
| **Por qué** | Auto-deploy de `main` aplicó ERP 519/520 sin firma CEO (ADR-063). Gate técnico evita repetición; harden 2026-07-25 cierra bypass `pnpm migrate`. |
| **Consecuencias** | Runbook `PROD_MIGRATE_GATE_RUNBOOK.md` · vars de aprobación son ventana única y reversibles · 519/520 **no se revierten** · `claimReady: false` |
| **Evidencia** | `prodMigrateGate.ts` · `migrate-prod.ts` · `migrate.ts` · vitest gate PASS · staging `da6b7a74` · prod `a82b55ac` · tip `c2edb2da` · **CEO-ACK ADR-067 #1 (2026-07-26)** |
| **Relación** | ADR-011 · ADR-063 · ADR-067 · KI governance prod migrate |

---

## ADR-065 — Railway Private RAG schema apply PREPARED_OFF

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-26 |
| **Decisión** | No añadir `local_ai_*` a migraciones SaaS auto. Apply solo vía `scripts/apply-local-ai-schema.mjs` con `NELVYON_LOCAL_AI_SCHEMA_APPLY=1` (+ `USE_MAIN_DB` o `LOCAL_AI_DATABASE_URL`). |
| **Por qué** | Extension pgvector ya en staging; path productivo requiere DDL + wiring consciente · evitar pending ADR-064 en prod por mig SaaS |
| **Evidencia** | `railwayRagPrep.ts` · tests · `RAILWAY_PRIVATE_RAG_PREP_RUNBOOK.md` · apply sin flag → exit 2 |
| **Estado** | **PREPARED_OFF** · cutover apply **BLOCKED_CEO** |

---

## ADR-066 — Puntos 1–4 prep close sin activación (CEO batch)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-26 |
| **Decisión** | Cerrar prep de (1) ADR-064 migrate gate, (2) ADR-062 dual-write, (3) ADR-065 RAG Railway, (4) canary IA prod — todos **PREPARED_OFF** / fail-closed — con **una frase SÍ/NO por punto** en `CEO_POINTS_1_4_APPROVAL_REQUEST.md`. Sin SÍ escrito: **prohibido** migrate prod nueva, dual-write, apply schema, canary. |
| **Por qué** | Pedido CEO: preparar y cerrar sin activar ni costes ni OpenAI. |
| **Evidencia** | `points_1_4_failclosed_latest.json` · `points_1_4_prep_latest.md` · ERP ALL_PASS · orphan classify 14→0 |
| **Consecuencias** | `claimReady: false` · activaciones solo tras respuesta CEO |

---

## ADR-067 — CEO decision puntos 1–4 (2026-07-26)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-26 |
| **Decisión** | **#1 SÍ** — certificar/mantener gate ADR-064 fail-closed (ventana temporal obligatoria); **no** ejecutar migraciones nuevas ahora. **#2 NO todavía** — dual-write ERP PREPARED_OFF / JSONB SSOT. **#3 NO todavía** — RAG Railway apply bloqueado / sin DDL. **#4 NO todavía** — canary IA + OpenAI + OpenClaw + MCP + SM productivo OFF en prod. |
| **Por qué** | Firma CEO escrita en chat Cursor · política migrate sin abrir activaciones de coste/riesgo. |
| **Evidencia** | `CEO_POINTS_1_4_APPROVAL_REQUEST.md` · `points_1_4_ceo_decision_latest.md` · vitest gate + soft-flag reject · ERP A/B ALL_PASS · apply exit 2 |
| **Consecuencias** | Gate policy **CEO-ACK** · cutovers 2–4 siguen **BLOCKED_CEO** · `claimReady: false` · **NOT READY** |
