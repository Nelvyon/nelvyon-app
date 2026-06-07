# NELVYON — Auditoría final de estado (post AUTONOMOUS-PHASE-D)

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Commit de referencia:** `0f54d81` (Phase D)  
**Alcance:** SaaS, OS, Services, Autonomous, Producción — read-only sobre codebase y docs  
**Fuera de alcance:** Verificación live de Railway/Supabase prod (marcado como pendiente ops)

---

## Resumen ejecutivo

| Dimensión | % global | Veredicto |
|-----------|----------|-----------|
| **SaaS beta cerrada** | **~78%** | Vendible como CRM + pipeline con onboarding asistido |
| **SaaS v1 comercial** | **~55%** | Falta billing real, ESP campañas, cierre legacy |
| **OS beta operativa** | **~88%** | Flujo cliente→entregable→portal cerrado en código |
| **OS v1 comercial** | **~85%** | Falta ops prod verificada + deprecar legacy UI |
| **Services (agencia humana)** | **~90%** | Docs/SOPs/pricing listos; portfolio ilustrativo |
| **Autonomous (3 SKUs piloto)** | **~80% pipeline lab** | Phases A–D en repo; **no vendible al cliente** |
| **Producción (deploy)** | **~60%** | Migraciones en repo; env vars prod sin auditar aquí |

### Respuestas directas

| Pregunta | Respuesta |
|----------|-----------|
| **¿Puede NELVYON vender ya?** | **Sí**, como **agencia premium con SOPs + OS workflow** y **SaaS CRM beta cerrada** (5–15 partners). **No** como plataforma all-in-one ni como fábrica autónoma sin humanos. |
| **¿Qué puede vender exactamente?** | Landing/Web/Chatbot/SEO/Ads **human-led**; CRM + pipeline deals; OS entregables + portal aprobación (beta); bundles y retainers según `docs/commercial/NELVYON_PRICING.md`. |
| **¿Qué NO debe prometer?** | Marketing automation terminado; email marketing con entrega real; autonomous 72h SLA; TikTok automatizado; portfolio ROI verificado; OS/SaaS 100% unificado; self-serve billing. |
| **¿Qué falta para 90% / 95% / 100%?** | Ver §8. |
| **¿Qué hacer el lunes?** | Ver §9. |

---

## 1. SaaS

**Referencias:** `docs/BETA_LAUNCH_AUDIT.md`, `docs/BETA_LAUNCH_RUNBOOK.md`, `backend/saas/`, `apps/web/src/app/saas/`

| Módulo | Estado % | Qué funciona | Qué falta | Riesgo | Prioridad | Tiempo restante |
|--------|----------|--------------|-----------|--------|-----------|-----------------|
| **CRM** | **88%** | CRUD contactos, actividades, búsqueda, cuotas en create; API `/api/saas/crm/*`; UI `/saas/crm`; tests `saasCrm*.test.ts` | Cuotas no enforced en todas las rutas; dualidad legacy `contacts`/`crm_contacts` | Bajo | P2 | 2–3 d |
| **Pipeline / Deals** | **85%** | `saas_deals` (312–314), kanban, métricas, sync stage; `SaasDealsService`; tests deals + dedupe + pipeline sync | ETL prod no ejecutado; migraciones 310–314 sin verificar en prod | **Alto** (ops) | **P0** | 0.5–2 d ops |
| **Workflows** | **55%** | CRUD, activate/pause/execute; trigger `deal_stage_changed` cableado; UI `/saas/workflows`; tests workflows + deal | Triggers `contact_created`, `scheduled`, `job_completed` sin dispatch; sin scheduler | **Alto** (comercial) | P2 | 2–4 sem |
| **Campañas** | **45%** | CRUD, audiencia real (incl. deal stage), stats UI `/saas/campanias`; tests campañas | `launchCampania` **simula envío** — marca `sent` sin ESP | **Alto** (comercial) | P2 | 3–6 sem |
| **Billing** | **40%** | Plan onboarding; lectura uso/límites `/api/saas/billing`; RBAC `billing.read`; tests plan limits + invoice | Sin checkout Stripe/Paddle SaaS; upgrade self-serve | Medio | P1 | 1–2 sem |
| **RBAC** | **80%** | Roles owner/admin/member/viewer; `requireSaasContext` + nav filtrado; tests RBAC API | ~90 rutas Pages Router `/pages/api/saas/*` sin RBAC SaaS | **Alto** | P1 | 3–5 d UI + 2–4 sem legacy |
| **Dashboard** | **65%** | Resumen tenant, actividad, pipeline comercial `/saas/dashboard`; tests dashboard | Jobs/spend vacíos; 19 sub-rutas F62 mock accesibles por URL | Medio | P2 | 2–3 d |

**Migraciones SaaS en repo (pendiente verificar prod):** 310–314 (`310_saas_tenant_workspace_bridge.sql` … `314_saas_workflows_deal_trigger.sql`)

**Validadores:** `pnpm validate:saas-deals-migrations`, `pnpm saas:validate-bridge`

**Tests:** ~28 archivos vitest en `backend/saas/__tests__/` — no en CI gate web principal.

---

## 2. OS (Operating System interno)

**Referencias:** `docs/OS_V1_FINAL_AUDIT.md`, `docs/OS_PRODUCTION_READINESS.md`, `docs/OS_RLS_AUDIT.md`, migraciones 315–322

| Módulo | Estado % | Qué funciona | Qué falta | Riesgo | Prioridad | Tiempo restante |
|--------|----------|--------------|-----------|--------|-----------|-----------------|
| **Clientes** | **90%** | `os_clients` (315); API `os_clients.py`; UI canónica default; invites portal; tests API + vitest | Backfill prod si hay `nelvyon_clients` legacy; flag legacy UI | Medio (ops) | P1 | 0.5–1 d |
| **Proyectos** | **88%** | `os_projects` (316); API + UI canónica; tests | Backfill prod; módulos legacy usan `legacyApi.ts` | Medio | P1 | 0.5–1 d |
| **Tareas** | **85%** | `os_tasks` (317); API `os_tasks.py` + REST; UI canónica; tests | Sin vínculo tarea↔entregable en UI | Bajo | P2 | 2–3 d |
| **Entregables** | **92%** | `os_deliverables` (318), versiones (321), reviews (320); workflow completo; upload; tests API + upload | Bucket Supabase config ops; `/os/documentos` legacy paralelo | Medio (ops) | P1 | 1 d ops |
| **Portal** | **90%** | Auth invite/login; proyectos/entregables; approve/reject; download; `portal_rest.py`; tests portal | Multi-usuario enterprise; white-label | Bajo | P3 | 1–2 sem |
| **Upload/Download** | **88%** | Upload OS + signed URL download portal; `os_deliverable_storage.py`; bucket `os-deliverables` | Políticas storage Supabase; rate limits prod | Medio | P1 | 0.5 d ops |
| **RLS** | **85%** | Migración `322_os_rls.sql` — 8 tablas FORCE RLS; matriz `OS_RLS_AUDIT.md`; test estático SQL | Backend usa service_role (bypass); 322 debe aplicarse en prod | Medio | **P0** | 15 min–1 h |
| **Auditoría** | **82%** | `os_audit_service.py` → `security_events`; upload/download/portal/email; tests audit | Sin dashboard auditoría; sin alertas | Bajo | P2 | 3–5 d |
| **Notificaciones** | **85%** | SendGrid vía `os_notification_service.py`; invite/publish/reject/revision; tests (4, en smoke 24) | Sin cola async; sin `SENDGRID_*` → cola `no_api_key` | Medio (ops) | **P0** | 30 min ops |

**Migraciones OS en repo:** 315–322 (última = RLS). Validador: `pnpm validate:os-core-migrations` ✅ (2026-06-07).

**Smoke OS:** 24 pytest documentados en `docs/OS_SMOKE_TEST_FINAL.md`.

**Autonomous OS (Phase D):** `POST /api/v1/os/autonomous/publish` — staging controlado, no portal auto-publish.

---

## 3. Services (agencia humana)

**Referencias:** `docs/services/`, `docs/commercial/`, `docs/portfolio/`, `docs/sales/`, `docs/operations/`

| Módulo | Estado % | Qué funciona | Qué falta | Riesgo | Prioridad | Tiempo restante |
|--------|----------|--------------|-----------|--------|-----------|-----------------|
| **SOPs (11 SKUs)** | **95%** | 11 SOPs + tiers `NELVYON_SERVICE_TIERS.md`; índice `SERVICES_QA_MASTER.md` | Naming legacy Standard vs Professional en algunos SOPs | Bajo | P2 | 1–2 d |
| **QA humano (G0–G5)** | **90%** | Gates, severidad, templates en `SERVICES_QA_MASTER.md` | Documentación operativa — **no enforced en código** | Medio | P1 | Ops rollout |
| **`qa_engine` API** | **75%** | `qa_engine.py` MIN_SCORE=90; `/api/v1/qa/validate`; dashboard | No conectado a SERVICES ni autonomous (umbral 90 vs 85) | Medio | P2 | 2–3 sem |
| **Pricing / commercial** | **95%** | 7 docs `docs/commercial/` — pricing, propuesta, contrato, deck, calificación | Tier “Autonomous Starter” aún no comercializado | Bajo | P3 | 1 sem |
| **Portfolio** | **40%** | 5 case studies `docs/portfolio/CASE_STUDY_*.md` | **Todos ficticios/ilustrativos** — no métricas verificadas | **Alto** | P1 | 3–6 sem/caso real |
| **Sales playbook** | **95%** | 7 docs `docs/sales/` — playbook, outreach, scripts | CRM manual; sin enforcement scope SOP | Bajo | P3 | — |
| **Operations** | **95%** | Manual + 6 SOPs en `docs/operations/` | Rol operador autonomous no documentado aún | Bajo | P2 | 1 sem |
| **Delivery code-backed** | **60–75%** | Web, Landing, Chatbot “Sí” (`SERVICES_MASTER_PLAN.md` §2.3); builders + agents | Logo “No SKU”; TikTok “No”; SEO/Ads “Condicionado” | Medio | P1 | Por SKU |

### SKUs vendibles hoy (modelo humano)

| SKU | Tier | Entrega | Autonomía real |
|-----|------|---------|----------------|
| Landing | Starter / Pro / Premium | Freelancer + G3 QA + OS | Humano + builders |
| Web corporativa | Starter / Pro / Premium | Idem | Humano + `os_web_builder` |
| Chatbot IA | Starter / Pro / Premium | `chatbot_service` + QA gold set | Humano + código |
| SEO | Starter / Pro / Premium | Informe + on-page; requiere GSC cliente | Humano + APIs condicionadas |
| Google Ads / Meta Ads | Starter / Pro / Premium | Setup + creatividades; OAuth cliente | Humano + APIs |
| Ecommerce básico | Starter / Pro | Stripe + catálogo CSV | Humano-heavy |
| Branding / Logo | Pro / Premium | Brand book; logo vector humano | Humano |
| TikTok Ads | Pro | Estrategia + setup semi-manual | **No automatizado** |
| Automatizaciones | Starter / Pro | Zapier-like; APIs terceros | Parcial |

---

## 4. Autonomous Services (post Phase D)

**Referencias:** `docs/autonomous/`, `backend/autonomous/`, commit `0f54d81`

| Fase / SKU | Estado % | Qué funciona | Qué falta | Riesgo | Prioridad | Tiempo restante |
|------------|----------|--------------|-----------|--------|-----------|-----------------|
| **Phase A** (contratos) | **100%** docs | JSON contracts, prompts, rubrics QA ≥85 | — | Bajo | Done | — |
| **Phase B** (simulación) | **85%** | Mock offline 3 SKUs; CLI `autonomous:simulate`; vitest | Sin DB/API real | Bajo (lab) | Done | — |
| **Phase C** (LLM + QA) | **70%** | LLM adapter mock/real; offline scorer; wrappers; CLI `autonomous:phase-c` | Wrappers **mock** (`production_deploy: false`); sin Playwright/GSC/PSI real | **Alto** | P0 | 8–10 sem |
| **Phase D** (OS publish) | **80%** | `POST /api/v1/os/autonomous/publish`; QA≥85; `AUTONOMOUS_PRODUCTION` gate; 8 pytest | Default dry-run; nunca `client_visible`; sin handoff portal post-revisión | Medio | P1 | 6–8 sem |
| **NELVYON-LANDING** | **80%** lab | Pipeline B/C/D; rubric Lighthouse/Playwright | Deploy real; QA browser; dominio live | **Alto** | P0 | 8–10 sem |
| **NELVYON-CHATBOT** | **78%** lab | Pipeline + gold set rubric | `chatbot_service` real wrapper; widget live | **Alto** | P0 | 8–10 sem |
| **NELVYON-SEO** | **75%** lab | Pipeline + informe mock | GSC/PSI/crawl real; PDF producción | **Alto** | P0 | 8–10 sem |

### Límites reales (no prometer)

| Límite | Fuente |
|--------|--------|
| TikTok Marketing API no integrada | `AUTONOMOUS_SERVICES_MODE.md` §8.2, `TIKTOK_ADS_SOP.md` |
| OAuth cuentas ads = acción cliente | Plan §8.2 |
| Sectores regulados → pausa autónomo | Plan §7 |
| Logo vector / trademark = humano | Plan §8.2 |
| Video UGC broadcast quality | Plan §8.2 |
| SEO link building outreach | Plan §8.2 |
| Ecommerce >100 SKU | Plan §8.2 |
| Portal auto-publish al cliente | Phase D — bloqueado por diseño |
| Producción DB sin `AUTONOMOUS_PRODUCTION=true` | Phase D — bloqueado por diseño |

### Autonomía estimada (honesta)

| Métrica | Valor | Nota |
|---------|-------|------|
| Pipeline lab 3 SKUs (A+B+C+D) | **~80%** | `AUTONOMOUS_PHASE_D_OS_PUBLISH.md` §9 |
| Phase B fixtures (briefs ideales) | Landing 92%, Chatbot 88%, SEO 86% | Mock rules — no SLA cliente |
| Proyectos sin intervención humana (objetivo año 1) | ≥70% Starter | **No alcanzado** — requiere wrappers prod + pilotos |
| 11 SKUs autonomous | **0% vendible** | Solo 3 en código; resto plan |

### Endpoint Phase D (resumen)

```
POST /api/v1/os/autonomous/publish
```

- RBAC: owner/admin/operator
- `dry_run=true` (default) → sin escrituras DB
- `dry_run=false` + `AUTONOMOUS_PRODUCTION=true` → `os_deliverables` en `in_review` / `internal`
- Tests: `backend/tests/test_os_autonomous_publish.py` (8 passed)

---

## 5. Producción

**Referencias:** `railway.json`, `backend/.env.railway.example`, `docs/OS_PRODUCTION_GO_LIVE_CHECKLIST.md`

| Área | Estado % | Qué funciona | Qué falta | Riesgo | Prioridad | Tiempo restante |
|------|----------|--------------|-----------|--------|-----------|-----------------|
| **Migraciones SaaS 310–314** | **?** | En repo; `migrate.ts` en releaseCommand Railway | Aplicación en `_migrations` prod **no verificada** | **Alto** | **P0** | 30 min–2 h |
| **Migraciones OS 315–322** | **?** | En repo; validador local OK | Aplicación prod + RLS 322 | **Alto** | **P0** | 30 min–2 h |
| **Variables Railway** | **70%** | Documentadas en `.env.railway.example`, `OS_PRODUCTION_READINESS.md` | Verificar `DATABASE_URL`, `JWT_SECRET_KEY`, `SUPABASE_*`, `SENDGRID_*`, `FRONTEND_APP_URL` en prod | **Alto** | **P0** | 45 min |
| **Supabase bucket** | **75%** | Código listo `OS_DELIVERABLES_BUCKET=os-deliverables` | Crear bucket privado + políticas en Supabase prod | **Alto** | **P0** | 30–60 min |
| **SendGrid** | **75%** | OS emails implementados | Configurar `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL` | Medio | **P0** | 15–30 min |
| **Smoke tests** | **65%** | OS: 24 pytest; SaaS: vitest local; runbooks manuales | E2E staging no ejecutado; CI web `pnpm gate` no incluye SaaS/OS E2E | Medio | **P0** | 1–2 h |
| **ETL SaaS Block B** | **50%** | Scripts `runBlockB.ts`, `BlockBFinalAudit.ts` (untracked) | `saas:block-b` no en `package.json`; ETL prod sin dry-run validado | Medio | P1 | 1–3 h |
| **CI/CD** | **70%** | `web-quality-gates.yml`; backend CI pytest | Gates no cubren full SaaS/OS regression | Bajo | P2 | 1 sem |

### Variables críticas (checklist)

**API (Railway backend):**
```
DATABASE_URL
JWT_SECRET_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OS_DELIVERABLES_BUCKET=os-deliverables
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
FRONTEND_APP_URL
AUTONOMOUS_PRODUCTION=false   # default seguro
```

**Web (Railway Next.js):**
```
DATABASE_URL
NEXT_PUBLIC_API_BASE_URL
```

---

## 6. Qué queda para cada hito estratégico

### 6.1 Beta operativa (2–4 semanas)

| Producto | Estado actual | Gap | Tiempo |
|----------|---------------|-----|--------|
| **OS beta operativa** | ~88% código | P0 ops: migraciones 315–322, bucket, SendGrid, smoke manual | **0.5–1 día ops** |
| **SaaS beta cerrada** | ~78% | P0 ops: migraciones 310–314, Block B dry-run, Beta Terms escritos | **1–2 días ops + 1 sem estabilización** |
| **Services piloto** | Docs listos | 1 caso real en portfolio; 1 proyecto piloto con SOP completo | **2–4 sem** |

**Criterio salida beta operativa:** 1 workspace OS en prod con upload→portal→approve; 5–15 tenants SaaS con onboarding asistido; 0 overselling campañas/workflows.

### 6.2 v1 comercial (3–4 meses)

| Área | Gap principal | Tiempo |
|------|---------------|--------|
| SaaS | Billing Stripe self-serve; campañas ESP real; workflows triggers; cierre legacy Pages Router | **6–10 sem** |
| OS | Deprecar `/os/documentos` legacy; dashboard audit; multi-usuario portal básico | **2–4 sem** |
| Services | 3+ case studies reales; scorecard freelancer operativo | **6–8 sem** |
| Producción | CI E2E; monitoring; SLA interno | **2–3 sem** |

**Criterio salida v1 comercial:** NPS ≥7 en beta; facturación automatizada SaaS Starter; OS sin rutas legacy en flujo principal.

### 6.3 Agencia autónoma IA (6–10 meses)

| Hito | Estado | Gap | Tiempo desde hoy |
|------|--------|-----|------------------|
| Wrappers prod (Landing/Chatbot/SEO) | Mock | Conectar builders reales + feature flags | **8–10 sem** |
| QA browser (Playwright) + GSC/PSI | Rubric only | CI gates en pipeline C | **4–6 sem** |
| Portal handoff post-revisión humana | Bloqueado Phase D | Workflow manual → `client_visible` controlado | **6–8 sem** |
| Piloto 10 proyectos Starter sin freelancer | 0 | Ops + métricas §9 plan | **3–4 meses post-wrappers** |
| 11 SKUs autonomous | 3 en código | 8 SKUs restantes | **+4–6 meses** |

**Criterio salida agencia autónoma:** ≥70% proyectos Starter sin intervención humana producción; score QA medio ≥88; SLA Landing Starter <72h en piloto interno.

### 6.4 Empresa de marketing premium (12–18 meses)

| Capacidad | Estado | Gap |
|-----------|--------|-----|
| Suite SaaS comparable HubSpot (breadth) | ~55% v1 | 12–24 meses feature gap documentado |
| Autonomous 11 SKUs | 3/11 | 9–10 meses plan |
| Portfolio verificado 10+ verticales | 0 reales | 6–12 meses |
| TikTok/Meta/Google full automation | Parcial/manual | APIs + video + compliance |
| White-label portal + SSO enterprise | No | 2–3 meses |
| Margen bruto +25–40pp vs freelancer | Modelo en plan | Validar con 20+ proyectos |

---

## 7. Matriz consolidada (todos los módulos)

| Módulo | % | Funciona | Falta | Riesgo | P | Tiempo |
|--------|---|----------|-------|--------|---|--------|
| SaaS CRM | 88 | CRUD, actividades, tenant isolation | Cuotas everywhere | Bajo | P2 | 2–3 d |
| SaaS Pipeline | 85 | Kanban, deals, sync | ETL prod | Alto | P0 | 0.5–2 d |
| SaaS Workflows | 55 | Deal stage trigger | Otros triggers, scheduler | Alto | P2 | 2–4 sem |
| SaaS Campañas | 45 | Audiencia, UI | ESP real | Alto | P2 | 3–6 sem |
| SaaS Billing | 40 | Límites, uso | Checkout | Medio | P1 | 1–2 sem |
| SaaS RBAC | 80 | App Router roles | Legacy routes | Alto | P1 | 3–5 d + legacy |
| SaaS Dashboard | 65 | KPIs pipeline | Jobs/spend, mocks URL | Medio | P2 | 2–3 d |
| OS Clientes | 90 | API, UI, invites | Backfill prod | Medio | P1 | 0.5–1 d |
| OS Proyectos | 88 | API, UI canónica | Legacy modules | Medio | P1 | 0.5–1 d |
| OS Tareas | 85 | API, UI | Link entregables | Bajo | P2 | 2–3 d |
| OS Entregables | 92 | Workflow, upload, versions | Bucket ops | Medio | P1 | 1 d |
| OS Portal | 90 | Auth, approve, download | White-label | Bajo | P3 | 1–2 sem |
| OS RLS | 85 | SQL 322 + tests | Apply prod | Medio | P0 | 1 h |
| OS Audit | 82 | security_events | Dashboard | Bajo | P2 | 3–5 d |
| OS Notifications | 85 | SendGrid code | Env prod | Medio | P0 | 30 min |
| Services SOPs | 95 | 11 SKUs documentados | Naming harmonize | Bajo | P2 | 1–2 d |
| Services QA humano | 90 | G0–G5 docs | Tooling | Medio | P1 | Ops |
| Services Portfolio | 40 | 5 case studies | Reales verificados | **Alto** | P1 | 3–6 sem/caso |
| Services Commercial | 95 | Pricing, sales, ops | Autonomous tier | Bajo | P3 | 1 sem |
| Autonomous A–D | 80% lab | Pipeline + staging endpoint | Prod wrappers, portal handoff | **Alto** | P0 | 6–10 meses MVP |
| Producción deploy | 60 | Scripts, docs, CI parcial | Migraciones + env prod | **Alto** | P0 | 1 día |

---

## 8. Roadmap a 90%, 95% y 100%

### 90% — Beta operativa sólida (4–6 semanas)

| # | Acción | Impacto |
|---|--------|---------|
| 1 | P0 ops: migraciones 310–322 en prod | SaaS + OS desbloqueados |
| 2 | Bucket Supabase + SendGrid + smoke E2E staging | OS entregables reales |
| 3 | Block B ETL SaaS dry-run validado | Pipeline datos limpio |
| 4 | Beta Terms + disclosure campañas simuladas | Riesgo comercial ↓ |
| 5 | 1 proyecto piloto Services con SOP G0–G5 completo | Prueba operativa |
| 6 | Deprecar nav legacy OS donde flag ya es canónico | UX coherente |

**% resultante estimado:** SaaS ~85%, OS ~92%, Services ops ~92%, Autonomous lab ~80% (sin cambio venta).

### 95% — v1 comercial (3–4 meses)

| # | Acción | Impacto |
|---|--------|---------|
| 1 | Stripe billing SaaS self-serve Starter/Pro | Revenue automatizado |
| 2 | ESP real en campañas (SendGrid/Resend tenant) | Campañas vendibles |
| 3 | Workflows: 3+ triggers + scheduler básico | Automation creíble |
| 4 | 3 case studies reales en portfolio | Sales defensible |
| 5 | Cierre rutas legacy SaaS RBAC | Seguridad |
| 6 | Dashboard audit OS + alertas básicas | Enterprise-ready parcial |
| 7 | Wrappers autonomous Landing en staging real (1 SKU) | Primer autonomous interno |

**% resultante estimado:** SaaS ~92%, OS ~95%, Services ~95%, Autonomous ~85% lab (1 SKU prod).

### 100% — Agencia autónoma + marketing premium (9–18 meses)

| # | Acción | Impacto |
|---|--------|---------|
| 1 | 3 SKUs autonomous en producción con SLA piloto | Modelo sin freelancer base |
| 2 | Portal handoff controlado post-revisión humana | Entrega cliente sin ops manual |
| 3 | 11 SKUs autonomous o humano con umbral QA 85 estable | Catálogo completo |
| 4 | Playwright + GSC + PSI en CI autonomous | QA creíble |
| 5 | SaaS breadth: secuencias, scoring, integraciones | vs HubSpot credible |
| 6 | 10+ case studies verificados multi-vertical | Premium positioning |
| 7 | SSO + white-label portal + SLA | Enterprise |
| 8 | TikTok API o modelo asistido documentado | SKU #11 honesto |
| 9 | Métricas §9 `AUTONOMOUS_SERVICES_MODE.md` en dashboard | Operación data-driven |
| 10 | Margen validado 20+ proyectos autonomous | Modelo económico probado |

**% resultante:** Producto integrado ~98–100% (siempre habrá excepciones humanas en Premium/regulado).

---

## 9. Qué hacer el lunes (priorizado)

### Mañana — P0 ops (bloquea todo)

| Hora | Tarea | Owner | Done cuando |
|------|-------|-------|-------------|
| 09:00 | Verificar `_migrations` prod: 310–314 + 315–322 | Ops | Log migrate OK |
| 09:30 | `pnpm validate:saas-deals-migrations` + `saas:validate-bridge` contra prod | Ops/Dev | Exit 0 |
| 10:00 | `pnpm validate:os-core-migrations` contra prod | Ops/Dev | Exit 0 incl. RLS 322 |
| 10:30 | Railway: confirmar `DATABASE_URL`, `SUPABASE_*`, `SENDGRID_*`, `FRONTEND_APP_URL` | Ops | Health + test email |
| 11:00 | Crear bucket privado `os-deliverables` Supabase | Ops | Upload test OK |
| 11:30 | Confirmar `AUTONOMOUS_PRODUCTION=false` en prod | Ops | Env audit |
| 12:00 | Smoke manual `docs/OS_SMOKE_TEST_FINAL.md` en staging | Ops/QA | Checklist ✓ |

### Tarde — P1 comercial + piloto

| Hora | Tarea | Owner | Done cuando |
|------|-------|-------|-------------|
| 14:00 | Redactar Beta Terms (campañas simuladas, billing manual, autonomous interno) | Comercial | Doc 1 página |
| 14:30 | Block B SaaS dry-run (`runBlockB.ts`) — sin apply hasta validar | Dev | Informe dedupe |
| 15:30 | Seleccionar 1 cliente piloto Services (Landing Starter) con SOP G0–G5 | Ops | Brief + OS project |
| 16:00 | Dry-run autonomous Phase D con payload real (`dry_run=true`) | Dev | 200 OK, no DB write |
| 17:00 | Actualizar deck comercial: quitar claims autonomous/ROI portfolio | Comercial | Deck alineado §7 |

### No hacer el lunes

- Activar `AUTONOMOUS_PRODUCTION=true` en prod
- Vender autonomous como producto terminado
- Prometer campañas email con entrega real
- Publicar case studies como métricas verificadas

---

## 10. Posicionamiento comercial final

### Vender hoy ✅

1. **Agencia premium** — Landing, Web, Chatbot, SEO, Ads (human-led, SOP, QA G3, OS workflow)
2. **SaaS CRM beta cerrada** — Pipeline deals, RBAC, onboarding (5–15 partners)
3. **OS beta operativa** — Entregables, portal aprobación, upload/download (1 workspace piloto)
4. **Bundles y retainers** — según `NELVYON_PRICING.md` con scope SOP explícito

### No vender / no prometer ❌

1. Fábrica 100% autónoma sin humanos
2. SLA 72h Landing autonomous
3. Marketing automation tipo HubSpot
4. Email marketing con deliverability garantizada (SaaS campañas)
5. TikTok Ads automatizado
6. ROI de portfolio ficticio
7. “All-in-one growth OS”
8. Self-serve billing SaaS
9. Portal auto-publish desde pipeline autonomous
10. OS/SaaS “100% unificado” sin verificar prod

---

## 11. Referencias cruzadas

| Documento | Uso |
|-----------|-----|
| `docs/BETA_LAUNCH_AUDIT.md` | SaaS beta |
| `docs/BETA_LAUNCH_RUNBOOK.md` | Ops SaaS P0 |
| `docs/OS_V1_FINAL_AUDIT.md` | OS beta (~88%) |
| `docs/OS_PRODUCTION_READINESS.md` | Go-live OS |
| `docs/OS_PRODUCTION_GO_LIVE_CHECKLIST.md` | Checklist lunes |
| `docs/OS_SMOKE_TEST_FINAL.md` | 24 pytest + E2E manual |
| `docs/OS_RLS_AUDIT.md` | Matriz RLS 322 |
| `docs/AUTONOMOUS_SERVICES_MODE.md` | Plan 11 SKUs |
| `docs/autonomous/AUTONOMOUS_PHASE_D_OS_PUBLISH.md` | Phase D endpoint |
| `docs/commercial/NELVYON_PRICING.md` | Precios |
| `docs/sales/NELVYON_SALES_PLAYBOOK.md` | Ventas |
| `docs/operations/NELVYON_OPERATIONS_MANUAL.md` | Operaciones |
| `docs/SERVICES_MASTER_PLAN.md` | Catálogo servicios |

---

## 12. Control de cambios

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-06-07 | Auditoría inicial post Phase D (`0f54d81`) |

---

*Documento generado sin cambios de código. Para ejecutar validadores contra prod, usar runbooks §9 y `OS_PRODUCTION_GO_LIVE_CHECKLIST.md`.*
