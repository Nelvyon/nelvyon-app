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
| S32 | API pública + OpenAPI + dev portal: migration 443 (api_key_usage_log + daily view), requirePublicApiContext (in-memory rate limit 60req/min + scope check), /api/public/v1/contacts (GET+POST crm.read/write), /api/public/v1/deals (GET pipeline.read), /api/public/v1/campaigns (GET campaigns.read), /api/public/v1/workflows/trigger (POST crm.write), /api/saas/api-keys/usage (GET 7d chart), docs/openapi/saas-public-v1.yaml (OpenAPI 3.1), /saas/developers (curl examples + endpoint table + scopes + OpenAPI download), /saas/api-keys fix (rawKey real, link developers), 24 tests | 27242cac |
| S33 | Enterprise SSO + Audit 100% + RBAC total: migration 444 (saas_sso_configs + saas_sso_identities + audit_logs indices), SaasSsoService (OIDC/SAML upsertConfig AES-256-GCM, toggleEnforce, deleteConfig, JIT-provision getOrCreateIdentity, resolveTenantByDomain, buildOidcAuthUrl), /api/saas/sso (GET config/identities, POST configure/toggle-enforce/delete), /api/auth/sso/callback (code→token exchange, JIT provision, session JWT cookie), SaasAuditService v2 (getTotal, exportCsv, purgeOlderThan 90d retention), /api/saas/audit v2 (GET format=csv download, GET total+entries, POST purge), saasRbac: +sso.read +sso.write +audit.read +settings.write, /saas/settings tab SSO (owner/admin guard, OIDC form, toggle enforce, callback URL), /saas/auditoria reescrita (filtros módulo/acción/fechas API real, paginación server-side, export CSV), 39 tests | 2b016bc5 |
| S42 | Integrations hub — 30 conectores + marketplace UI: migration 450 (saas_integration_connections tenant_id/connector_slug/status CHECK/external_account_id/external_account_name/access_token_enc/refresh_token_enc/scopes JSONB/metadata JSONB/last_sync_at/error_message UNIQUE tenant+slug; idx tenant+status); integrationsCatalog.ts 31 conectores tipados (IntegrationConnector id/slug/displayName/icon/category ads|crm|email|commerce|analytics|comms|productivity|payments/connectionType oauth|env|db|manual/envKeys/docsUrl/relatedRoute/status live|beta|coming_soon); SaasIntegrationsHubService (listCatalog +envConfigured, listConnections merge DB+ads getStatus+klaviyo getStatus+env checks, disconnect DELETE, getAuthorizeUrl ads→relatedRoute/OAuth→/api/saas/oauth/connect/env→422 NOT_OAUTH/coming_soon→422, recordConnection UPSERT, buildSummary counts); /api/saas/integrations reescrita GET default→{catalog,connections,summary} + GET action=authorize&provider→{authorizeUrl} + DELETE?provider=slug; STATIC_PROVIDERS eliminado de /saas/integraciones/page.tsx; UI marketplace: búsqueda texto + filtros 8 categorías + KPI strip 4 cards (catálogo/conectadas/solo-env/oauth) + grid ConnectorCard (icon/displayName/badge Conectado|Env OK|Próximamente|Sin conectar/env hint Railway/Gestionar link/btn Conectar oauth|Configurar env|Próximamente disabled|Desconectar); 20 tests vitest (catalog shape, no duplicates, envConfigured, listConnections merge, env ses, klaviyo, DB override, disconnect, getAuthorizeUrl ads/env/coming_soon/not_found, buildSummary); TS 0; suite 112/1542 | (current) |
| S41 | Mobile PWA base — instalable /saas shell: public/manifest-saas.json (scope=/saas start_url=/saas/dashboard display=standalone theme=#0084ff bg=#020817 icons existentes); public/sw.js v2 (CACHE_NAME=nelvyon-saas-v1, precache +/saas/dashboard +/offline-saas.html, fetch handler skip /api/* /_next/*, navigate /saas/*→fallback /offline-saas.html, navigate otros→/offline.html); public/offline-saas.html (dark #020817 glass card, retry auto cada 10s→/saas/dashboard, safe-area-inset-top); /saas/layout.tsx (metadata apple-mobile-web-app-capable/title/status-bar-style, link manifest-saas.json, theme-color #0084ff, monta SaasPwaInstallPrompt); SaasPwaInstallPrompt (beforeinstallprompt handler, standalone guard, iOS Safari hint Compartir→pantalla inicio, dismiss localStorage saas-pwa-dismissed, btn min-h-[44px] dark glass fixed bottom safe-area); SaasShellLayout mobile top bar: h-11 w-11 hamburger ≥44px, paddingTop=max(0.75rem,env(safe-area-inset-top)); GET /api/saas/pwa/status force-dynamic; SaasPwaInstallPrompt.test.tsx 11 tests; TS 0; suite +11 | (current) |
| S40 | Ads 10/10 — write ops + atribución multi-touch real: migration 449 (CREATE saas_ads_campaign_links tenant_id/platform/external_campaign_id/external_campaign_name/utm_campaign/utm_source/utm_medium UNIQUE tenant+platform+external_id; 2 indexes); SaasAttributionService +getModelBreakdown (first_touch/last_touch/linear/time_decay half-life 7d; SQL journey subquery contacts con conversion; credit fraccional normalizado por touchpoint; sort desc; tipos ModelCredit+ModelBreakdown+AttributionModel exportados); SaasAdsDashboardService +linkCampaign UPSERT saas_ads_campaign_links +listCampaignLinks +getAttributedRoas (spend de metrics cache agrupado por platform; attribution inline subquery misma lógica model; join por utm_campaign; roas=conversiones/spend; tipos AdsCampaignLink+AdsCampaignLinkInput+AttributedRoasRow+AdsAttributionModel exportados); /api/saas/ads/attribution GET resource=roas|links|models + POST action=link; /api/saas/reportes GET resource=models; UI /saas/publicidad: 2 tabs Métricas/Atribución, AttributionTab (selector modelo+ventana, tabla campaña/plataforma/utm/spend/conv/ROAS coloreado, estado vacío CTA vincular, footer hint cache+table), LinkCampaignModal (form platform+campaignId+name+utm_campaign+source+medium, POST attribution link); SaasAttributionService.s40.test.ts 10 tests + SaasAdsAttributionBridge.s40.test.ts 14 tests; TS 0; suite 111/1522 | (current) |
| S39 | WhatsApp 10/10 — Meta templates sync, catalog, template send UI: migration 448 (CREATE saas_wa_templates tenant_id/meta_template_id/name/language/status CHECK/category/components JSONB/quality_score/synced_at UNIQUE tenant+name+lang; CREATE saas_wa_catalog_products tenant_id/meta_product_id/catalog_id/name/description/price_amount/price_currency/image_url/availability/retailer_id UNIQUE tenant+product_id; CREATE saas_wa_settings tenant_id PK/waba_id/catalog_id; 2 indexes); SaasWhatsAppCloudService v2 (resolveWabaId env META_WA_BUSINESS_ACCOUNT_ID→Graph /{phoneId}?fields=whatsapp_business_account+cache en memoria; fetchMessageTemplates GET /{wabaId}/message_templates?limit=100 con paginación next; syncTemplates UPSERT saas_wa_templates; listTemplates filtros status+language; sendTemplate validación+delegate send; fetchCatalogProducts GET /{catalogId}/products paginado; syncCatalog env META_WA_CATALOG_ID→saas_wa_settings fallback; _syncCatalogId UPSERT+price parse; listCatalogProducts; metaSendTemplateMsg extendida con components[]); route.ts POST actualizado body? optional+templateComponents WaTemplateComponent[]; /api/saas/whatsapp/templates GET listTemplates+POST action=sync; /api/saas/whatsapp/catalog GET listCatalogProducts+POST action=sync; UI /saas/whatsapp reescrita 3 tabs (Mensajes KPIs+historial, Plantillas tabla name/lang/category/status badge verde/amarillo/rojo+body preview+variables {{n}}+btn Enviar APPROVED only, Catálogo grid imagen/precio/availability/SKU, syncMsg feedback) + SendTemplateModal (form teléfono+variables dinámicas extraídas de components BODY, components build params, preview componentes HEADER/BODY/FOOTER); estados vacíos honestos (Meta no config banner amarillo, sin plantillas→sync CTA, sin catálogo→META_WA_CATALOG_ID hint); saasWhatsAppS39.test.ts 27 tests (resolveWabaId ×5, syncTemplates ×3, listTemplates ×5, sendTemplate ×5, syncCatalog ×6, listCatalogProducts ×3); saas-whatsapp-depth.spec.ts 3 E2E; TS 0; suite 111/1519 | (current) |
| S38 | Inbox 10/10 — threading, round-robin, SLA, email SES: migration 447 (ALTER conversations +thread_id UUID +subject +first_response_at +sla_due_at +sla_breached +priority CHECK low/normal/high/urgent; ALTER conversation_messages +parent_message_id FK self +channel +metadata JSONB; CREATE saas_inbox_sla_policies tenant_id PK, first_response_minutes 60, resolution_minutes 480, business_hours_only; CREATE saas_inbox_routing tenant_id PK, round_robin_enabled, last_assigned_member_id; indexes thread_id/sla_due WHERE open/contact_id+thread_id); SaasInboxService v2 (getOrCreateThread stable UUID per contact, listThreads GROUP BY thread_id+contact STRING_AGG channels+BOOL_OR breached+MIN sla_due, getThread cross-channel messages batch, assignRoundRobin via SaasTeamService list active roles cycle+UPSERT routing, assignConversation explicit/round-robin, getSlaPolicy defaults 60/480, setSlaPolicy UPSERT, computeSlaDue now+firstResponseMinutes, checkSlaBreaches UPDATE sla_breached WHERE open+expired+noFirstResponse, listSlaAtRisk breached OR <30min, replyToConversation email SES SendEmailCommand +subject from conv, first_response_at on first outbound +clear sla_breached if within SLA, enrichConversationList JOIN saas_contacts batch); createConversation auto-thread+auto-round-robin+sla_due; updateConversation +priority; listConversations LEFT JOIN saas_contacts + slaAtRisk/threadId filters; /api/saas/inbox (GET view=threads / sla=at_risk / threadId / filters, POST set_sla_policy/get_sla_policy/check_sla_breaches/create); /api/saas/inbox/[id]/assign (POST member_id explicit or round-robin); UI /saas/inbox reescrita (KPI 3 cards open/at-risk/breached, tabs Conversaciones/Hilos, filtro SLA en riesgo + canal, list badge SLA verde/amarillo/rojo+minutos+priority, thread view channels icons+count+hasBreached, right panel dropdown assign members+round-robin button+SLA first_response_at, reply feedback dispatched/error); saasInboxS38.test.ts 30+ tests; saas-inbox-depth.spec.ts 3 E2E | (current) |
| S37 | Web builder depth — WYSIWYG editor, domain verify, CDN publish: migration 446 (ALTER saas_web_pages +seo_title +seo_description +published_html +cdn_url +domain_status CHECK IN none/pending/verified/failed +domain_verified_at +ssl_status CHECK IN pending/active/failed +ssl_verified_at; CREATE saas_web_page_versions id/page_id FK/version/sections JSONB, UNIQUE page_id+version; idx_web_pages_published WHERE published; uidx_web_pages_verified_domain WHERE verified+published); SaasWebBuilderService v2 (reorderSections/addSection/deleteSection/duplicateSection, saveVersion/listVersions/restoreVersion, verifyCustomDomain dns.promises.resolveCname→pages.nelvyon.com, markSslActive, publish v2 rendered publishedHtml+cdn_url resolving tenant subdomain, unpublish, getPublicPage JOIN saas_tenants, getPublicPageByDomain custom_domain+verified, recordView atomic views++; renderHtml v2 hero/text/features/cta/contact/image/video + SEO meta tags); /api/saas/web-builder extended (switch-case 13 actions: publish/unpublish/render/update/delete/add-section/delete-section/duplicate-section/reorder-sections/save-version/list-versions/restore-version/verify-domain); /api/saas/web-builder/[pageId] GET+PATCH; public rate-limited routes /api/public/site/[subdomain]/[slug] Cache-Control 300s + /api/public/site/domain/[host]; UI /saas/web-builder/[pageId] WYSIWYG 3 columnas (panel secciones ↑↓+dupli+del, iframe live preview, panel props por sección tipo, toolbar SEO/Historial/Dominio/Guardar/Publicar/Copiar URL, modals Domain verify DNS+SSL badge, SEO seoTitle/seoDesc, History versiones+restore); /w/[subdomain]/[slug] SSR fallback; saasWebBuilderS37.test.ts 33 tests; saas-web-builder-depth.spec.ts 3 E2E; TS 0, suite 109/1463 | (current) |
| S36 | Funnels depth — A/B variants, public funnel, checkout, analytics v2: migration 445 (saas_funnel_step_variants: step_id FK, variant_key A\|B, content JSONB, weight_pct, visitors, conversions; saas_funnel_events: funnel_id, step_id, variant_key, event_type visit\|conversion\|checkout_start\|checkout_complete, session_id, metadata; ALTER saas_funnels +published_at +public_slug UNIQUE partial index per tenant); SaasFunnelService v2 (createVariant/updateVariant/listVariants, pickVariant weighted deterministic hash-based A/B, recordEvent insert+counters, publish v2 generates publicSlug, pause validates active status, getByPublicSlug WHERE status='active', getAnalytics v2 per-step+per-variant CVR+drop-off); /api/saas/funnels/[funnelId] extended (GET ?resource=variants&stepId=, POST pause/add-variant/update-variant-weight); Public routes rate-limited (GET /api/public/funnel/[slug] 120/min, GET /api/public/funnel/[slug]/step/[order] 120/min, POST /api/public/funnel/[slug]/event 180/min, POST /api/public/funnel/[slug]/checkout 30/min Stripe Checkout Session direct fetch); /saas/funnels rewrite (KPIs, filter tabs, builder columna steps ↑↓ reorder+delete+add, step editor HTML+CTA, A/B toggle+weight slider, analytics tab funnel bars drop-off per-variant CVR, publish/pause/copy URL, zero MOCK); /f/[slug]/page.tsx (public funnel multi-step progress bar, A/B session determinism, visit event tracking, CTA handler, 404 state); saasFunnelsS36.test.ts 32 tests (listVariants ×3, createVariant ×3, pickVariant ×4, recordEvent ×5, publish ×3, pause ×3, getByPublicSlug ×3, getAnalytics ×6, updateVariant ×2); saas-funnels-depth.spec.ts 3 E2E (builder carga, analytics tab, public 404); TS 0, suite 108/1430 | (current) |
| S35 | E2E hardening + security audit: 51 Playwright tests en apps/web/e2e/saas/ (7 specs: saas-auth ×7, saas-crm ×8, saas-pipeline ×4, saas-campanias ×5, saas-workflows ×6, saas-billing ×4, saas-modules ×17) + saas-public-api ×10 (401 sin key ×5, formato inválido ×2, respuesta shape ×2); playwright.saas.config.ts (chromium only, 4 workers CI, artifacts on failure); .github/workflows/playwright-saas.yml (triggers PR/push saas/ paths, anti-MOCK gate, anti-stub gate, artifacts on failure); saasS35Security.test.ts: 57 tests (RBAC matrix owner/admin/member/viewer ×45, public API scope logic ×8, security invariants ×4); security audit: headers CSP+XFrameOptions ya presentes en next.config.ts, requirePublicApiContext ya incluye rate limit 60req/min, rutas públicas intencionales documentadas (unsubscribe/lms/cert/oauth/callback); TS 0, suite 107/1398 | (current) |
| S34 | i18n ES/EN + audit wiring + UX polish: messages/es.json + en.json namespace saas.* (nav.groups ×6, nav.items ×37, common ×17, errors ×6, settings ×5, sso ×12, audit ×9) con paridad total ES↔EN; CrmAuditPort en SaasCrmService (create/update/delete contact → audit.log), CampaniasAuditPort en SaasCampaniasService (launchCampania → audit.log), WorkflowAuditPort en SaasWorkflowService (executeWorkflow → audit.log), audit.log en /api/saas/api-keys (POST create + DELETE revoke); SSO hardening: validateIdTokenClaims (iss/aud/exp/iat, SAML documented as coming soon); UX: SaasErrorBoundary (class, aria role=alert, retry), SaasBreadcrumb (semantic nav, aria-current, focus-visible), SaasShellLayout mobile sidebar (hamburger toggle, overlay, aria-expanded, aria-controls); /saas/settings selector idioma (useLocaleContext, cookie persistente); 20 tests (i18n parity ×8, CRM audit ×4, Campanias audit ×1, Workflow audit ×2, SSO claims ×4, SaasErrorBoundary) | (current) |

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

# SSO Enterprise (S33) — 32-byte key as 64-char hex (openssl rand -hex 32)
SAAS_SSO_ENCRYPTION_KEY=

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

## S35 COMPLETE — Listo para L1 deploy manual

**Estado tras S35:** código 100% completo, TS 0 errores, 107 test files / 1398 tests passed, 51 Playwright E2E specs creados, CI workflow `.github/workflows/playwright-saas.yml` configurado.

### Checklist L1 — Deploy manual en Railway

#### 1. Variables de entorno (Railway → Settings → Variables)

| Variable | Obligatoria | Notas |
|---|---|---|
| `JWT_SECRET` | ✅ | ≥32 chars — auth SaaS |
| `DATABASE_URL` | ✅ | Railway Postgres 16 URL |
| `NEXTAUTH_SECRET` | ✅ | random 32 chars |
| `NEXTAUTH_URL` | ✅ | `https://app.nelvyon.com` |
| `NEXT_PUBLIC_APP_URL` | ✅ | igual, sin trailing slash |
| `SES_REGION` | ✅ | `eu-west-1` |
| `SES_ACCESS_KEY_ID` | ✅ | |
| `SES_SECRET_ACCESS_KEY` | ✅ | |
| `SES_FROM_EMAIL` | ✅ | dirección verificada en SES |
| `STRIPE_SECRET_KEY` | ✅ | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_...` |
| `STRIPE_PRICE_ID_STARTER` | ✅ | |
| `STRIPE_PRICE_ID_PRO` | ✅ | |
| `STRIPE_PRICE_ID_AGENCY` | ✅ | |
| `CRON_SECRET` | ✅ | protege `/api/cron/*` |
| `SAAS_SSO_ENCRYPTION_KEY` | ✅ | `openssl rand -hex 32` (64 chars hex) |
| `TRACKING_SECRET` | ⚠️ | fallback: JWT_SECRET |
| `AUTONOMOUS_PRODUCTION` | ⚠️ | default `false`; activar post-gate |
| `TWILIO_ACCOUNT_SID` | opcional | SMS/WhatsApp |
| `TWILIO_AUTH_TOKEN` | opcional | |

#### 2. Migraciones

```bash
# Ejecutar todas las migraciones en orden en Railway Console o psql
psql $DATABASE_URL < backend/db/migrations/001_*.sql
# ... hasta ...
psql $DATABASE_URL < backend/db/migrations/444_sso_config.sql
```

#### 3. Deploy

```bash
git push origin main
# Railway detecta el push → build automático → deploy
```

#### 4. Post-deploy verification

```bash
# P0 smokes contra producción
node scripts/run-staging-p0-smokes.mjs --base-url https://app.nelvyon.com

# Public API 401 check
curl -s https://app.nelvyon.com/api/public/v1/contacts | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'error' in d"

# Health check
curl -sf https://app.nelvyon.com/api/health | grep '"ok":true'

# Anti-MOCK y anti-stub gates
node scripts/check-saas-stubs.mjs
node scripts/check-no-v1-saas-pages.mjs
```

#### 5. Post-deploy acciones únicas

- [ ] Confirmar SNS subscription en AWS SES (recibirás email de confirmación)
- [ ] Configurar Cron jobs en Railway (ver tabla "Railway Cron jobs" abajo)
- [ ] Crear primer tenant owner via `/auth/register`
- [ ] Verificar skin dark `/saas/dashboard` en browser prod (`#020817`)
- [ ] Enviar primera campaña de prueba y verificar open-pixel en SES logs
- [ ] Activar `AUTONOMOUS_PRODUCTION=true` solo tras `scripts/run-os-autonomous-gate.mjs` exitoso

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
