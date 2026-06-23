# NELVYON — Master Execution Brief for Cursor / Claude Code

> **Propósito:** Documento único para que Cursor termine Nelvyon como plataforma **100% autónoma** (OS + SaaS) sin humanos/freelancers, con todos los servicios de marketing digital, IA, automatizaciones, conectores, plantillas Envato/Aceternity, y SaaS comparable/superior a HubSpot + GoHighLevel.
>
> **Repo:** `C:\Users\Asus\Downloads\app_v181` · GitHub `Nelvyon/nelvyon-app` · Prod `https://nelvyon.com`
>
> **Regla de oro:** EXTENDER el código existente. NO reescribir desde cero. NO crear productos paralelos.

---

## 0. INSTRUCCIÓN INICIAL PARA CURSOR (pegar como primer mensaje)

```
Eres el agente principal de NELVYON. Lee COMPLETO docs/CURSOR_NELVYON_MASTER_EXECUTION.md antes de escribir código.

Visión: agencia de marketing digital 100% autónoma + SaaS líder (HubSpot + GoHighLevel en uno).
Cero humanos en el flujo de entrega. Kickoff → agentes → QA → portal → métricas.

Ejecuta FASE 1 completa antes de FASE 2. Cada PR debe pasar tests y smokes indicados.
No añadas mocks silenciosos en prod. No simules envíos de email. No pidas "terminar todo" en un commit.

Empieza por: leer TECH_HANDOFF.md, ejecutar pnpm gate en apps/web, y el item 1.1 (campañas email reales).
```

---

## 1. VISIÓN Y DEFINICIÓN DE "HECHO"

### 1.1 Qué es Nelvyon

- **OS (interno):** motor autónomo que ejecuta servicios de marketing (SEO, ads, landings, email, social, funnels, chatbots, etc.) vía agentes IA + plantillas + conectores.
- **SaaS (cliente):** panel multi-tenant con CRM, pipeline, campañas, workflows, billing, portal de entregables — comparable a GHL + HubSpot.
- **Agency tier:** plan comercial `agency` (497€/mes) + white-label para partners — NO es un tercer codebase.

### 1.2 Flujo autónomo objetivo (Definition of Done global)

```
Signup → Onboarding legal → Plan Stripe → Workspace/Tenant
  → Cliente elige pack o servicio
  → POST kickoff (sin humano)
  → OsOrchestrator + agentes premium/sector
  → Plantilla Envato/Aceternity personalizada
  → QA score ≥ 85 (qa_engine)
  → Auto-approve entregable si QA OK
  → Portal cliente: entregables + métricas CEO
  → Campañas/workflows ejecutan en ESP real (SES/Klaviyo)
  → Dashboard unificado: GA4 + Ads + CRM
```

**Criterio binario:** un usuario nuevo puede registrarse, pagar, lanzar pack Local, recibir entregables en portal, y recibir email de campaña real — **sin intervención humana**.

### 1.3 Qué NO es "hecho"

- UI que existe pero devuelve `mock: true`
- `launchCampania()` que marca `sent` sin ESP
- Workflows con triggers definidos pero sin dispatch
- 193 agentes sectoriales que solo escriben `{sector}_results` vacíos
- Seeds catalogados (27k filas) pero no on-disk (solo 58 seeds)
- Portfolio/case studies ilustrativos (`docs/portfolio/`)

---

## 2. DECISIONES DE PRODUCTO (NO RENEGOCIAR — implementar)

| # | Decisión | Valor |
|---|----------|-------|
| D1 | Producto principal | Solo `apps/web` (Next.js). Deprecar `frontend/` Vite |
| D2 | Superficie SaaS canónica | `/saas/*` — eliminar redirects confusos a `/crm` |
| D3 | Billing | Stripe Live único. Paddle eliminado. Precios SSOT: `backend/billing/planConfig.ts` |
| D4 | Email transaccional + campañas | AWS SES primario (`backend/email/sesClient.ts`) |
| D5 | Email marketing avanzado | Klaviyo o Mailchimp como segundo conector (Fase 2) |
| D6 | IA | OpenAI primario (`backend/os-agents/LlmClient.ts`); mock solo en test |
| D7 | QA gate autonomía | `backend/routers/qa_engine.py` MIN_SCORE=85 antes de portal |
| D8 | Plantillas | Nunca servir ZIP Envato crudo; siempre personalizar vía `seed-personalizer.ts` |
| D9 | Mock en prod | PROHIBIDO silencioso. Si falta API key → error UI claro |
| D10 | Legacy APIs | 90 rutas `pages/api/saas/*` → migrar con RBAC o 410 en 30 días |
| D11 | Idioma producto | Español primario; i18n EN en Fase 4 |
| D12 | Autonomous factory | Solo prod con `AUTONOMOUS_PRODUCTION=true` tras smokes verdes |

---

## 3. INVENTARIO CÓDIGO EXISTENTE (USAR, NO DUPLICAR)

### 3.1 Arquitectura

| Capa | Path | Rol |
|------|------|-----|
| Web app | `apps/web/` | UI + BFF `/api/*` |
| Shared TS | `backend/billing/`, `backend/stripe/`, `backend/saas/`, `backend/os-agents/`, `backend/db/` | Lógica compartida |
| Python API | `backend/main.py`, `backend/routers/` (176 archivos) | Legacy + integraciones |
| Migraciones | `backend/db/migrations/` (294 SQL) | Postgres schema |
| Deploy | `railway.json`, `apps/web/Dockerfile` | Railway web :3000 |

### 3.2 OS y agentes

| Recurso | Path |
|---------|------|
| Orquestador | `backend/os-agents/OsOrchestrator.ts` |
| 25 agentes premium | `backend/os-agents/OsAgentRegistry.ts` |
| ~193 sectores | `backend/os-agents/sectorOsRegistry.ts` |
| Cola jobs | `backend/queue/queueClient.ts`, `backend/queue/osWorker.ts` |
| Kickoff packs | `apps/web/src/lib/packs/packOrchestrator.ts` |
| Portal BFF | `apps/web/src/app/api/platform/portal/**` |
| Autonomous pipeline | `backend/autonomous/` |

### 3.3 SaaS tenant

| Módulo | UI | API | Service |
|--------|----|----|---------|
| Dashboard | `app/saas/dashboard/` | `api/saas/dashboard/` | `SaasDashboardService.ts` |
| Onboarding | `app/saas/onboarding/` | `api/saas/onboarding/` | `SaasOnboardingService.ts` |
| CRM | redirect → `/crm` **(ARREGLAR)** | `api/saas/crm/` | `SaasCrmService.ts` |
| Deals | embebido | `api/saas/deals/` | `SaasDealsService.ts` |
| Campañas | `app/saas/campanias/` | `api/saas/campanias/` | `SaasCampaniasService.ts` **(SIMULA ENVÍO)** |
| Workflows | `app/saas/workflows/` | `api/saas/workflows/` | `SaasWorkflowService.ts` **(PARCIAL)** |
| Billing | `app/saas/billing/` | `api/saas/billing/` | Sin checkout integrado **(ARREGLAR)** |
| Nav oficial | `apps/web/src/features/saas-shell/saasNav.ts` | | |

### 3.4 Packs (IDs exactos)

```typescript
// apps/web/src/lib/packs/types.ts
local-business-growth    // 7 available en servicePacksCatalog
ecommerce-growth
saas-b2b-growth
// + seo-local, meta-ads, email-welcome, landing-funnel (available)
// analytics-insights (beta)
// 5 packs coming_soon
```

Kickoff routes: `POST /api/os/packs/{packId}/kickoff`

### 3.5 Planes Stripe

```typescript
// backend/billing/planConfig.ts
starter: 47€/mes — 100 agent calls, 3 sectores — STRIPE_PRICE_ID_STARTER
pro: 197€/mes — 500 calls, 10 sectores — STRIPE_PRICE_ID_PRO
agency: 497€/mes — 2000 calls, 999 sectores — STRIPE_PRICE_ID_AGENCY
agency_partner: 197€ wholesale — STRIPE_PRICE_ID_AGENCY_PARTNER
```

Checkout: `POST /api/billing/checkout` → `backend/stripe/stripeApi.ts` (Live OK prod)

### 3.6 Plantillas

| Recurso | Path |
|---------|------|
| Catálogo 27.676 filas | `apps/web/src/lib/template-library/seed-download-catalog.ts` |
| Doc tabla | `docs/templates/ENVATO_ACETERNITY_DOWNLOADS_TABLE.md` |
| Seeds on-disk (~58) | `templates/seeds/aceternity/`, `templates/seeds/envato/` |
| Selector | `apps/web/src/lib/template-library/seed-selector.ts` |
| Personalizer | `apps/web/src/lib/template-library/seed-personalizer.ts` |
| Capas SaaS/OS | `apps/web/src/lib/template-library/service-layers.ts` (38 SaaS + 36 OS) |
| Download script | `apps/web/scripts/download-envato-seeds.ts` |
| Provision script | `scripts/templates/provision-seeds.mts` |

### 3.7 Conectores (`apps/web/src/lib/os-core/connectorRegistry.ts`)

| Conector | Status | Service path |
|----------|--------|--------------|
| Google Analytics 4 | **live** | `backend/integrations/GoogleAnalytics4Service.ts` |
| Google Search Console | **live** | `backend/integrations/GoogleSearchConsoleService.ts` |
| Amazon SES | **live** | `apps/web/src/lib/email/sesMailer.ts` |
| Google Ads | oauth_ready | `backend/integrations/GoogleAdsService.ts` |
| Meta Ads | oauth_ready | `backend/integrations/MetaAdsService.ts` |
| Shopify | oauth_ready | `backend/integrations/ShopifyService.ts` |
| TikTok Ads | stub | |
| LinkedIn Ads | stub | |
| SEMrush | stub | |
| WhatsApp | stub | |
| Twilio | stub | |
| Telegram | stub | |
| HubSpot CRM | planned | |
| Salesforce | planned | |
| Klaviyo | planned | |
| Mailchimp | planned | |

---

## 4. GAP vs HUBSPOT + GOHIGHLEVEL (checklist implementación)

Marcar ✅ cuando funcional en prod con test E2E.

### CRM & Sales
- [ ] Contactos CRUD tenant-scoped
- [ ] Empresas/deals pipeline kanban
- [ ] Actividades / timeline
- [ ] Import/export CSV
- [ ] Scoring leads (IA)
- [ ] Dialer integrado (Twilio live o eliminar UI)

### Marketing
- [ ] Email campaigns ESP real (open/click/bounce)
- [ ] Email sequences / drips
- [ ] SMS (Twilio)
- [ ] WhatsApp Business
- [ ] Landing pages builder visual
- [ ] Funnels multi-step
- [ ] Forms + embed
- [ ] A/B testing en emails/landings

### Social & Ads
- [ ] Social scheduler publish real (FB/IG/LI)
- [ ] Google Ads create/read campaigns
- [ ] Meta Ads create/read campaigns
- [ ] TikTok Ads (live o quitar del marketing)
- [ ] UTM tracking unificado

### Automation
- [ ] Visual workflow builder
- [ ] Triggers: form, tag, deal stage, date, webhook, email event
- [ ] Actions: email, SMS, tag, deal update, webhook, delay, IA prompt
- [ ] Recipe library (templates automation_recipe)

### Commerce & Billing
- [ ] Stripe checkout self-serve en `/saas/billing`
- [ ] Subscriptions + portal Stripe
- [ ] Invoices
- [ ] Store `/store/[subdomain]` checkout
- [ ] Agency white-label + Stripe Connect rebilling

### Service Delivery (OS — diferenciador GHL)
- [ ] Pack kickoff 1-click autónomo
- [ ] Agentes IA generan entregables
- [ ] QA auto ≥85
- [ ] Portal cliente approve/reject
- [ ] CEO metrics dashboard por pack

### Analytics & Reporting
- [ ] GA4 integrado
- [ ] Ads ROAS dashboard
- [ ] CRM funnel analytics
- [ ] Executive PDF reports

### Platform
- [ ] RBAC owner/admin/member/viewer en TODO el SaaS
- [ ] API keys tenant + webhooks
- [ ] Audit log UI
- [ ] SSO enterprise (Fase 4)

---

## 5. FASES DE EJECUCIÓN (orden estricto)

### FASE 1 — Autonomía comercial real (P0) — 4-6 semanas

#### 1.1 Campañas email REALES
- **Archivo:** `backend/saas/SaasCampaniasService.ts` → `launchCampania()`
- **Hacer:** Enviar vía `backend/email/emailService.ts` (SES). Estados: queued/sent/bounced. Webhook SES o eventos.
- **UI:** `apps/web/src/app/saas/campanias/page.tsx` — métricas reales
- **Test:** `backend/saas/__tests__/saasCampanias.test.ts` + smoke manual staging
- **Done when:** POST launch → email llega a inbox test (mailinator ok)

#### 1.2 Workflows autónomos
- **Archivo:** `backend/saas/SaasWorkflowService.ts`
- **Triggers:** `contact_created`, `deal_stage_changed`, `form_submitted`, `scheduled` (cron cada 5 min vía `CRON_SECRET`)
- **Actions:** `send_email`, `update_deal`, `add_tag`, `webhook_out`, `delay_minutes`
- **Done when:** cambiar deal stage → email enviado automáticamente (test vitest + staging)

#### 1.3 Auto-publish pack sin humano
- **Archivos:** `apps/web/src/lib/packs/packOrchestrator.ts`, `backend/autonomous/publish/osPublishPayload.ts`, `backend/routers/qa_engine.py`
- **Flujo:** kickoff → agents → QA ≥85 → auto-approve → portal deliverables
- **Done when:** `staging-smoke-local-pack-e2e.mjs` pasa SIN approve manual operador

#### 1.4 Unificar SaaS + billing
- Integrar `POST /api/billing/checkout` en `/saas/billing/page.tsx`
- Unificar precios: alinear `backend/core/billing_catalog.py` con `planConfig.ts`
- CRM en `/saas/crm` UI real (no redirect a `/crm`)

#### 1.5 Seguridad legacy
- Auditar `apps/web/src/pages/api/saas/**` (~90 rutas)
- Migrar a App Router + `requireSaasContext` OR return 410
- Documentar en `docs/PHASE_3B_SAAS_LEGACY_CLEANUP.md`

#### 1.6 Validación Fase 1
```bash
cd apps/web && pnpm gate
node scripts/run-staging-p0-smokes.mjs
CRON_SECRET=... node scripts/e2e-phase0-prod.mjs  # prod
node scripts/e2e-checkout-prod.mjs  # checkout 3 planes
```

---

### FASE 2 — GHL parity core (P1) — 6-10 semanas

1. Funnel/landing builder visual (`backend/routers/funnel_builder.py`, `landing_builder.py`)
2. Social publish real Meta + LinkedIn (`backend/services/social_publishers/`)
3. Google/Meta Ads campaign create + reporting (quitar `EMPTY_CAMPAIGNS` en prod)
4. Inbox omnicanal (`backend/routers/omnichannel.py`) email+WhatsApp+SMS
5. Calendario/booking en SaaS nav (`backend/routers/bookings.py`)
6. White-label agencies Stripe Connect (`apps/web/src/lib/partners/partnerStripeConnect.ts`)
7. Conectores stub → live: WhatsApp, Twilio, TikTok Ads, LinkedIn Ads

---

### FASE 3 — HubSpot parity + plantillas (P1-P2) — 10-16 semanas

1. Reporting unificado GA4+Ads+CRM (`/analytics/*`)
2. LMS en SaaS nav (`backend/routers/lms.py`)
3. Ecommerce store completo (`/store/[subdomain]`)
4. Reputation/reviews (`/reputacion/*`)
5. API pública + webhooks tenant (`backend/routers/public_api.py`)
6. **Plantillas:** ejecutar `download-envato-seeds.ts` → mínimo **500 seeds on-disk** prioritarios por sector (ver ENVATO table)
7. Klaviyo/Mailchimp conectores live
8. 5 packs `coming_soon` → `available`

---

### FASE 4 — Escala mundial (continuo)

- SSO, SOC2, multi-región, marketplace templates, autonomous 72h SLA productizado

---

## 6. VARIABLES DE ENTORNO (humano debe proveer en Railway)

### 6.1 Railway Web (`@nelvyon/web`) — OBLIGATORIAS

Copiar de `apps/web/.env.example`:

```
DATABASE_URL
JWT_SECRET (min 32 chars)
NEXT_PUBLIC_APP_URL=https://nelvyon.com
NEXT_PUBLIC_LEGAL_ENTITY_NAME=NELVYON S.L.
CRON_SECRET
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER
STRIPE_PRICE_ID_PRO
STRIPE_PRICE_ID_AGENCY
OPENAI_API_KEY
SES_REGION=eu-west-1
SES_ACCESS_KEY_ID
SES_SECRET_ACCESS_KEY
SES_FROM_EMAIL=no-reply@nelvyon.com
SES_FROM_NAME=NELVYON
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
OAUTH_ENCRYPTION_KEY (32 bytes hex)
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
META_APP_ID / META_APP_SECRET
GA4_DEMO_FALLBACK=0  # prod: solo datos reales
AUTONOMOUS_PRODUCTION=false  # true solo tras Fase 1 smokes
```

### 6.2 Railway API Python (opcional) — `backend/.env.railway.example`

Mismo `JWT_SECRET`, `DATABASE_URL`, `STRIPE_*`, `SENDGRID_*` o SES, integraciones ads/social.

### 6.3 Secrets que Cursor NO puede inventar (pedir al humano)

- Stripe Live keys + Price IDs (Dashboard Live, cuenta acct_1TkA6z...)
- AWS SES IAM keys (dominio nelvyon.com verificado DKIM)
- OpenAI API key con billing activo
- Google Cloud OAuth client (redirect prod registrado)
- Meta App ID/Secret (redirect prod)
- Envato Elements / Aceternity descarga (credenciales para `download-envato-seeds.ts`)
- Railway `CRON_SECRET` (32 chars random)
- Supabase `DATABASE_URL` service role

---

## 7. COMANDOS DE VALIDACIÓN (ejecutar tras cada fase)

```bash
# Unit + lint
cd apps/web && pnpm gate

# Staging P0 (packs + portal)
node scripts/run-staging-p0-smokes.mjs

# Prod auth + health
E2E_BASE_URL=https://nelvyon.com node scripts/e2e-phase0-prod.mjs

# Prod checkout Stripe
node scripts/e2e-checkout-prod.mjs

# Stripe repair audit
CRON_SECRET=... node scripts/fix-stripe-starter-live.mjs

# Demo preflight
node scripts/staging-demo-preflight.mjs

# Migraciones validators
cd apps/web && pnpm validate:saas-deals-migrations
cd apps/web && pnpm validate:os-core-migrations
```

**CI:** `.github/workflows/web-quality-gates.yml`, `.github/workflows/staging-smoke-p0.yml`

---

## 8. REGLAS DE CÓDIGO (Cursor debe obedecer)

1. **No hardcodear** `price_*` — solo `process.env.STRIPE_PRICE_ID_*` (`planConfig.ts`)
2. **No mock silencioso** en rutas prod — usar `connectorRegistry` status + error UI
3. **No simular** email sent — usar SES o fallar con error claro
4. **Tests obligatorios** por módulo tocado (vitest en `backend/saas/__tests__/` o `apps/web/src/**/__tests__/`)
5. **Migraciones SQL** en `backend/db/migrations/` numeradas secuencialmente
6. **RBAC SaaS** en toda ruta tenant: `requireSaasContext` pattern
7. **Commits atómicos** por feature Fase X.Y — mensaje convencional (`fix(billing):`, `feat(saas):`)
8. **No tocar** `.edge-envato-*`, browser profiles, archivos cache gitignored
9. **Push a main** solo tras smokes verdes (human approval)
10. **Documentar** cambios de scope en este file sección 10 (changelog)

---

## 9. ARCHIVOS PROHIBIDOS DE TOCAR SIN RAZÓN

- `frontend/` (legacy Vite) — solo eliminar referencias, no ampliar
- `backend/paddle/` — dead code, no revivir
- `apps/web/sentry.*.config.ts.disabled` — reactivar Sentry en Fase 2+, no borrar
- Portfolio ficticio — no publicar como casos reales

---

## 10. LO QUE EL HUMANO DEBE HACER (Cursor no puede)

- [ ] Rellenar secrets Railway (sección 6)
- [ ] Verificar migraciones 310–322 aplicadas en Supabase prod
- [ ] Marcar checklist legal `docs/BEFORE_LAUNCH_CHECKLIST.md`
- [ ] Aprobar push a `main` y deploy Railway
- [ ] Proveer credenciales Envato para descarga masiva seeds
- [ ] Casos de estudio reales (reemplazar portfolio ilustrativo)
- [ ] Decidir: Klaviyo vs Mailchimp como ESP marketing secundario

---

## 11. PROMPT SEMANAL (copiar cada semana a Cursor)

### Semana 1
```
Lee docs/CURSOR_NELVYON_MASTER_EXECUTION.md Fase 1.1 y 1.2.
Implementa campañas email reales en SaasCampaniasService.ts con SES.
Implementa workflow dispatch deal_stage_changed → send_email.
Tests vitest + confirma launch envía email.
No avances a Fase 2.
```

### Semana 2
```
Fase 1.3: auto-publish pack con QA ≥85 sin approve manual.
Modifica packOrchestrator.ts + qa_engine integration.
Extiende staging-smoke-local-pack-e2e.mjs para verificar auto-approve.
```

### Semana 3
```
Fase 1.4: checkout Stripe en /saas/billing, unificar planConfig/billing_catalog.
Fase 1.5: auditar pages/api/saas/* — migrar 20 rutas más críticas con RBAC.
```

### Semana 4
```
Fase 1.6: ejecutar todos los smokes, fix regressions.
Reactivar Sentry web (sentryCapture.ts + configs).
Documentar estado en sección 12 de este file.
```

### Semana 5-8 (Fase 2 inicio)
```
Conectores Meta publish + Google Ads read live.
Quitar EMPTY_CAMPAIGNS mock en prod path (adsBffRoute.ts).
Social scheduler publish real.
```

---

## 12. ESTADO ACTUAL (baseline 2026-06-23)

| Item | Estado |
|------|--------|
| Stripe checkout Live (3 planes) | ✅ Prod OK (commit 71157d6) |
| Packs Local + B2B E2E staging | ✅ P0 smokes |
| Portal BFF | ✅ |
| Campañas email real | ❌ Simulado |
| Workflows completos | ❌ Parcial |
| Auto-publish sin humano | ❌ |
| SaaS billing self-serve UI | ❌ |
| 500+ seeds Envato on-disk | ❌ (58/27k) |
| GHL/HubSpot parity | ❌ ~30% |
| Legal checklist | ❌ Sin marcar |

---

## 13. REFERENCIAS DOCS REPO

- `README.md` — visión
- `TECH_HANDOFF.md` — arquitectura + deploy
- `docs/NELVYON_FINAL_STATE_AUDIT.md` — % por módulo
- `docs/BETA_LAUNCH_AUDIT.md` — qué vender / no vender
- `docs/BEFORE_LAUNCH_CHECKLIST.md` — legal/ops
- `docs/STAGING_P0_SMOKES.md` — smokes
- `docs/templates/ENVATO_ACETERNITY_DOWNLOADS_TABLE.md` — plantillas
- `docs/PHASE_3B_SAAS_LEGACY_CLEANUP.md` — deuda SaaS
- `docs/commercial/` — pricing comercial humano
- `docs/services/` — SOPs agencia

---

## 14. MÉTRICAS DE ÉXITO FINAL

Nelvyon está "como quiero" cuando:

1. **Autonomía:** 0 pasos manuales en flujo signup → pack → portal (smoke automatizado)
2. **SaaS:** 80%+ checklist sección 4 marcado ✅
3. **Conectores:** ≥12 status `live` en connectorRegistry
4. **Plantillas:** ≥500 seeds on-disk, cada pack `available` tiene seed verificado
5. **Calidad:** `pnpm gate` + P0 smokes + e2e-phase0-prod verdes en CI
6. **Comercial:** checkout + campañas + workflows vendibles sin asterisco "beta"

---

*Generado para ejecución en Cursor. Actualizar sección 12 tras cada fase.*
