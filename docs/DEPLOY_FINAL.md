# DEPLOY FINAL — Nelvyon Production Checklist

> Estado: **Código completado** (Fases 1–12, S13, S14, S15, O7, S16, O8, S17, O9, S18, O10, S19, O11). Este documento cubre el deploy final en Railway.

---

## Resumen de fases completadas

| Fase | Descripción | Commit |
|---|---|---|
| Fase 1 | Servicios reales: pipeline, inbox, calendar, team, webhooks, api-keys, snippets, lead-scoring, CSV | `99b520f` |
| Fase 2 | Sequences, A/B testing, Twilio SMS, Forms→workflow | `3d32c9c` |
| Fase 9 | OS Autónomo real: packOrchestrator, seeds, QA gate, CEO metrics | `fb19b63` |
| Fase 10 | Omnicanal: WhatsApp BFF, Social Publish, Funnels multi-step, Web Builder, Calendar booking | `53e5ad5` |
| Fase 10b | Calendar contact email + citas SES booking confirm | `aef4dec` |
| Fase 11 | Ads & Performance: Meta/Google campaigns, ROAS alerts, UTM en reportes | `aa92526` |
| Fase 12 | LMS cursos/matrículas/certificados, Klaviyo connector, SMS→/api/saas, CI gate | `a7db3a0` |
| S13 | Helpdesk, Integraciones, SEO, Reputación GBP, Store BFF Stripe, CI anti-v1 gate | d4c760a |
| S14 | Funnels analytics/publish, Web Builder renderHtml/custom_domain/publish, PDF export, migration 429 | f849570 |
| S15 | Inbox omnicanal: reply SMS/WA/email, workflow send_sms/send_whatsapp, UI dispatch feedback | 10fae93 |
| S16 | WhatsApp Business Cloud API (Meta): SaasWhatsAppCloudService, inbound webhook, Cloud API first + Twilio fallback | 62ba68e |
| O8 | 5 beta packs con runner real: social-calendar, content-strategy, cro-audit, analytics-setup, brand-voice | 221fcc4 |
| S17 | Dialer Twilio: SaasDialerService click-to-call, /api/saas/dialer, UI real, log_call_activity workflow | a67bdda |
| O9 | 20 sector agents: +10 sectores (veterinaria…tecnologia), sectorSeeds.ts getSeedByIndex, docs/OS_SEEDS.md | c3aa3e1 |
| S18 | Sequences v2: branching, wait/branch steps, reply-hook, sequence_enrolled trigger, UI /saas/secuencias | 29a7822 |
| O10 | 500 seeds Envato metadata: download-envato-seeds 10×50, metadata index JSON, seed-selector 3-tier, 5 beta→available | ef4293d |
| S19 | Forms embed: honeypot spam, embed JS widget /public/embed/form.js, public GET /api/forms/[formId]; Surveys: share link /s/[id], create modal, responses panel | 53aa5cb |
| O11 | Recurring monthly services: OsRecurringServicesService (SEO report, social calendar, ads snapshot), cron /api/cron/os-recurring-services, migration 432 | d05941e |
| S20 | Social scheduler publish elite: cron /api/cron/social-publish (CRON_SECRET), no-account banner + post actions in /saas/social, 6 processDueScheduled tests | a76032a |
| O12 | QA visual + legal pre-portal: visualQaEngine (WCAG contrast + structural + legal), packOrchestrator qa_visual_score/qa_legal_passed, portal block if score<70 or legal fail | 418f46e |
| S21 | Ads create/edit: createCampaign + updateCampaignBudget (Meta + Google), POST /campaigns/create, PATCH /campaigns/[id], CreateCampaignModal + EditBudgetModal in /saas/publicidad | c715282 |
| O13 | Learning loop GA4→seed weights: OsLearningService CVR per sector, os_seed_weights table (migration 433), getTopSectorsByCvr + rankSeedsByCvr in seed-selector, cron /api/cron/os-learning-loop | b0d600a |
| S22 | TikTok + Snapchat ads: _fetchTikTokCampaigns, _createTikTokCampaign, _fetchSnapchatCampaigns, _createSnapchatCampaign in SaasAdsDashboardService; UI /saas/publicidad snapchat tab; 16 tests | 747bc16 |
| O14 | AUTONOMOUS_PRODUCTION=true guard: isAutonomousProductionEnabled() + guard in runGrowthPack; scripts/run-os-autonomous-gate.mjs; docs/OS_AUTONOMOUS_PROD.md; .github/workflows/os-gate.yml | 7cb1d7b |
| S23 | LMS 100%: módulos/lecciones CRUD, quiz JSONB, progreso %, certificados PDF firmados (HMAC), migration 434, 30 tests | 2443e0e |
| S24 | Store ecommerce: SaasStoreService (productos+variantes+stock+IVA EU+pedidos), migration 435, /saas/store UI, checkout+VAT+order DB, Stripe webhook, 29 tests | 6f3c3b2 |
| S25 | Reputation elite: SaasReputationService, GBP sync bidireccional, reply OAuth, workflow trigger review_received, migration 436, /saas/reputacion reescrita, 22 tests | 3d4104d |
| S26 | Agency white-label + Stripe Connect E2E: migration 437, subcuentas UI real, white-label UI carga API + tab Connect onboarding, 17 tests Connect mock | 8753582 |
| S27 | CRM Sales Hub: SaasPlaybooksService (forecast ponderado, playbooks CRUD, stage probs), SaasQuotesService (CPQ quotes PDF HMAC), migration 438, /saas/pipeline reescrita (forecast+deals+playbooks+quotes), 41 tests | 269bca8 |
| S28 | Service Hub: SaasHelpdeskServiceV2 (SLA auto-calc 3 políticas, macros CRUD+apply, thread mensajes), SaasKnowledgeBaseService (artículos+categorías CRUD, search, vote, views), migration 439, UIs /saas/helpdesk + /saas/knowledge-base cableadas, 53 tests | c2d6a547 |
| S29 | Marketing Hub: SaasLeadScoringService (reglas CRUD + scoreContact, grade A-D, hot/warm/cold), SaasAttributionService (UTM multi-touch, channel/campaign breakdown, first-last-linear), score_threshold en WorkflowTriggerType, migration 440, /api/saas/lead-scoring + /api/saas/reportes, UIs /saas/lead-scoring + /saas/reportes cableadas con atribución, 35 tests | 54e14d51 |
| S30 | Automations elite: score_threshold en TRIGGERS[] + matchesTriggerConfig (min_score/grade/category), review_received (min_rating) + sequence_enrolled (sequence_id), 3 nuevas acciones (enroll_sequence, create_task, update_field), version snapshots (saas_workflow_versions migration 441 + saveVersion/getVersions), /api/saas/workflows?resource=meta, /versions route, UI /saas/workflows reescrita (16 triggers, 17 acciones, builder visual paso a paso, panel detalle + runs + versiones), score_threshold dispatch en scoreContact, 23 tests | d63c315f |
| S31 | Afiliados + Loyalty tenant real: migration 442 (6 tablas), SaasAffiliateService (programa, links únicos AFF*, trackClick/trackConversion, comisiones pending→approved→paid, payoutSummary), SaasLoyaltyService (programa, earn/redeem/adjust puntos, tiers Bronze/Silver/Gold/Platinum auto-upgrade, balances, transacciones), saasRbac: +affiliates.read/write +loyalty.read/write, /api/saas/affiliates + /api/saas/loyalty, saasNav: +affiliates +loyalty, UI /saas/affiliates (enlaces, comisiones, config) + /saas/loyalty reescrita (miembros, dar puntos, config), 27 tests | 20d6b55b |
| S32 | API pública + OpenAPI + dev portal: migration 443 (api_key_usage_log + daily view), requirePublicApiContext (in-memory rate limit 60req/min + scope check), /api/public/v1/contacts (GET+POST crm.read/write), /api/public/v1/deals (GET pipeline.read), /api/public/v1/campaigns (GET campaigns.read), /api/public/v1/workflows/trigger (POST crm.write), /api/saas/api-keys/usage (GET 7d chart), docs/openapi/saas-public-v1.yaml (OpenAPI 3.1), /saas/developers (curl examples + endpoint table + scopes + OpenAPI download), /saas/api-keys fix (rawKey real, link developers), 24 tests | (current) |

---

## Variables de entorno requeridas

Ver `docs/LAUNCH_READY.md` para el listado completo. Variables mínimas para producción:

```bash
# Auth
JWT_SECRET=<min 32 chars>
NEXTAUTH_SECRET=<random>
NEXTAUTH_URL=https://app.nelvyon.com
NEXT_PUBLIC_APP_URL=https://app.nelvyon.com

# DB
DATABASE_URL=postgresql://...

# Email (AWS SES)
SES_REGION=eu-west-1
SES_ACCESS_KEY_ID=...
SES_SECRET_ACCESS_KEY=...
SES_FROM_EMAIL=noreply@nelvyon.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STORE_WEBHOOK_SECRET=whsec_...   # Opcional — si usas endpoint separado /api/webhooks/stripe-store
STRIPE_WEBHOOK_CONNECT_SECRET=whsec_... # Webhook Stripe Connect (cuenta plataforma) — /api/webhooks/stripe-connect
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_AGENCY=price_...

# Cron
CRON_SECRET=<random>

# Twilio (SMS + WhatsApp)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+34...
TWILIO_FROM_WHATSAPP=+14155238886

# SEO (opcional — sin clave muestra empty state)
SEMRUSH_API_KEY=
SEO_DOMAIN=app.nelvyon.com

# Ads platforms — API credentials (S21)
# Meta Ads: graph.facebook.com access token (system user or Marketing API)
META_ADS_ACCESS_TOKEN=
# Google Ads: OAuth access token + developer token
GOOGLE_ADS_ACCESS_TOKEN=
GOOGLE_ADS_DEVELOPER_TOKEN=
# LinkedIn Ads: LinkedIn Marketing Solutions access token
LINKEDIN_ADS_ACCESS_TOKEN=
# TikTok Ads: TikTok for Business → Marketing API → Access Token
TIKTOK_ADS_ACCESS_TOKEN=
TIKTOK_ADS_ADVERTISER_ID=
# Snapchat Ads: Snap Marketing API → OAuth2 Bearer
SNAPCHAT_ADS_ACCESS_TOKEN=
SNAPCHAT_ADS_ACCOUNT_ID=

# OS Autonomous Production (O14)
# Set to "true" only AFTER node scripts/run-os-autonomous-gate.mjs passes
AUTONOMOUS_PRODUCTION=false

# Social Publish — OAuth tokens (S20)
# Meta: generate at developers.facebook.com → Tools → Graph API Explorer
META_APP_ID=
META_APP_SECRET=
# LinkedIn: generate at linkedin.com/developers → Auth → Access Token
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Reputación / Google Business Profile (opcional)
GOOGLE_PLACES_API_KEY=             # Google Places API key para sync GBP reviews (read-only)
GBP_PLACE_ID=                      # Place ID del negocio en Google Maps
GBP_ACCESS_TOKEN=                  # OAuth token con scope business.manage (para reply)
GBP_ACCOUNT_ID=                    # GBP account ID (ej: accounts/1234567890)
GBP_LOCATION_ID=                   # GBP location ID (ej: locations/9876543210)
```

---

## Migraciones de base de datos

Ejecutar en orden numérico desde `backend/db/migrations/`:

```bash
# En Railway: ejecutar en la consola de Postgres o via psql
psql $DATABASE_URL -f backend/db/migrations/001_*.sql
# ... hasta
psql $DATABASE_URL -f backend/db/migrations/427_saas_lms.sql
```

**Última migración:** `429_web_pages_custom_domain.sql` (añade `custom_domain` a `saas_web_pages`)

---

## Checklist de deploy

### Railway Cron jobs

| Endpoint | Schedule | Purpose |
|---|---|---|
| `/api/cron/saas-workflows` | `*/4 * * * *` | Workflows scheduled + trigger |
| `/api/cron/social-publish` | `* * * * *` | Publish social posts scheduled_at ≤ NOW() |
| `/api/cron/os-recurring-services` | `0 8 1 * *` | Monthly deliverables (SEO, social calendar, ads) |
| `/api/cron/os-learning-loop` | `0 6 1 * *` | GA4 → sector CVR weights (seed-selector improvement) |

All crons use header `x-cron-secret: $CRON_SECRET`.

### Pre-deploy
- [ ] Todas las variables de entorno configuradas en Railway
- [ ] `DATABASE_URL` apunta a Postgres 16 en Railway
- [ ] SES email verificado en AWS (sender domain)
- [ ] Stripe webhook endpoint configurado: `https://app.nelvyon.com/api/billing/webhook`

### Deploy
```bash
# 1. Push a main (Railway detecta automáticamente)
git push origin main

# 2. Ejecutar migraciones en producción
node -e "require('./apps/web/src/lib/db/migrate')" || pnpm -C apps/web migrate

# 3. Verificar health
curl -sf https://app.nelvyon.com/api/health | grep '"ok":true'
```

### Post-deploy verificación
```bash
# P0 smokes
node scripts/run-staging-p0-smokes.mjs --base-url https://app.nelvyon.com

# CI check (no v1 refs en páginas saas)
node scripts/check-no-v1-saas-pages.mjs

# TypeCheck
pnpm -C apps/web exec tsc --noEmit

# Tests
pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm --reporter=dot
```

---

## Módulos disponibles en producción

### ✅ Operativos (API real + UI + tests)
- CRM (contactos, deals, pipeline)
- Campañas email (SES, bounce handling)
- Workflows (scheduled + trigger, idempotencia 4min)
- Billing + Stripe webhook
- Inbox omnicanal (email, SMS, WhatsApp, Instagram, Facebook, chat)
- SMS Marketing (Twilio)
- WhatsApp Business (Twilio)
- Social Publish (Meta + LinkedIn + Twitter/X)
- Funnels multi-step
- Web Builder (páginas)
- Calendar + booking email (SES)
- Citas (appointmentss con email confirm)
- Publicidad Digital (Meta Ads + Google Ads, campañas, ROAS alerts)
- UTM / Atribución
- Reportes (PDF ejecutivo + panel UTM)
- LMS (cursos, módulos, matrículas, certificados)
- Klaviyo connector (listas, campañas, profiles)
- OS Packs (local-business, ecommerce, saas-b2b) — auto-approve QA ≥ 85
- Portal cliente BFF
- CEO metrics dashboard (datos reales)
- A/B Testing
- Lead Scoring
- Snippets, API Keys, Webhooks, Team

### 🚫 Coming soon (desactivado — sin kickoff route)
- Afiliados, Dialer avanzado, LMS (versión legacy), Loyalty, Web Builder v1, Social v1

---

## Arquitectura de producción

```
Railway (Node 20)
├── apps/web (Next.js 15 App Router — port 3000)
│   ├── /saas/* — SaaS CRM + módulos (requireSaasContext)
│   ├── /os/*  — OS packs (OS agents, auto-approve)
│   ├── /portal/* — Agency portal BFF
│   └── /store/[subdomain] — Public Stripe checkout
├── backend/main.py (FastAPI — port 8000, en proceso de migración)
└── Railway Postgres 16

CDN / DNS
└── app.nelvyon.com → Railway service
```

---

## Contacto y soporte

- Repo: https://github.com/Nelvyon/nelvyon-app
- Issues: GitHub Issues
- Deploy target: Railway → app.nelvyon.com
