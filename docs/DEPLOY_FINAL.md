# DEPLOY FINAL — Nelvyon Production Checklist

> Estado: **Código completado** (Fases 1–12, S13, S14, S15, O7, S16, O8, S17, O9, S18, O10, S19, O11). Este documento cubre el deploy final en Railway.
>
> ✅ **SaaS S1–S56 COMPLETE** — todos los sprints SaaS (S13…S56) implementados, con tests vitest verdes, TS 0 y E2E. Última migración: `462_saas_pwa_installs.sql`.

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
| O19 | Recurring 10/10 (Run Log) — migration 467 (os_recurring_run_log id UUID PK/tenant_id/workspace_id/service_type CHECK seo|social|ads|reputation/period_key/status CHECK queued|running|completed|failed|skipped/deliverable_id/error_message/metadata JSONB/started_at/completed_at + UNIQUE INDEX tenant+service+period); OsRecurringRunLogService (periodKey YYYY-MM UTC; startRun UPSERT idempotente ON CONFLICT tenant+service+period no degrada completed; completeRun/failRun NOT_FOUND; skipRun idempotente duplicado; recordGeneration map RECURRING_TYPE_MAP seo_report→seo/social_calendar→social/ads_snapshot→ads, generados→completed resto→skipped; listRuns filtros tenant/service/period/status; getSummary 30d completed/failed/skipped+byService); cron os-recurring-services +recordGeneration tras generateMonthlyDeliverables (autopilot + legacy tenants, no-bloqueante); SaasAutopilotService.runNow seo/social +_logRecurringRun best-effort try/catch; APIs GET /api/os/recurring {summary,runs} ?serviceType&status&period, GET /api/os/recurring/[tenantId] historial, POST /api/os/recurring/trigger {tenantId,period?} manual admin idempotente (requirePlatformClaims force-dynamic); /os/recurring page ProtectedLayout module=os KPIs runs/completed/failed/skipped + trigger manual tenant_id + tabla tenant/service/period/status/deliverable→portal + empty honesto; exportar service+RECURRING_TYPE_MAP+tipos index.ts; idempotencia mismo tenant+service+YYYY-MM no duplica; 18 vitest tests; TS 0; suite verde | (current) |
| O18 | QA 10/10 Gate — migration 466 (os_qa_audit_runs id UUID PK/pack_run_id/deliverable_ref/tenant_id/workspace_id/visual_score/lighthouse_score/legal_passed/content_hash/baseline_hash/diff_percent NUMERIC/gate_status CHECK pending|passed|failed|blocked/failure_reasons JSONB/checks JSONB + INDEX pack_run+created DESC); OsVisualQaGateService (MIN_VISUAL_SCORE 85/MIN_LIGHTHOUSE 90/MAX_DIFF_PERCENT 5; computeContentHash sha256 whitespace-normalizado; computeLighthouseProxy heurístico structural40+contrast35→0-100 v1 proxy PSI real opcional GOOGLE_PSI_API_KEY; diffPercent Levenshtein acotado normalizado; runGate runVisualQa+proxy+hash diff vs baseline → gate_status blocked si !legal / failed si visual<85|lighthouse<90|diff>5 / passed + failureReasons; saveAuditRun INSERT; runAndPersist try/catch best-effort; listAuditRuns filtros; getGateSummary passRate+avg 30d); Hook packOrchestrator: tras runVisualQa→getOsVisualQaGateService().runAndPersist (persist audit linked pack_run_id, captura qa_gate_status en SkuRunResult, dynamic-import no-bloqueante); needsReview +qa_gate_status==='blocked' (legal hard-block consistente con legal_passed existente); APIs GET /api/os/qa {summary,recentRuns}, GET /api/os/qa/[runId], POST /api/os/qa/run {landingHtml,copyText,brandColor,baselineHtml} requirePlatformClaims force-dynamic; /os/qa page ProtectedLayout module=os KPIs passRate/avgVisual/avgLighthouse-proxy/blocked + tabla recent runs visual/lighthouse/legal/diff/status/reasons + label honesto proxy v1; thresholds enforced no silent bypass; AUTONOMOUS_QA_RUBRICS.md nota Lighthouse proxy v1; 21 vitest tests; TS 0; suite verde | (current) |
| O17 | 8 Packs E2E (Pack Certification) — migration 465 (os_pack_certifications pack_id PK/status CHECK pending|running|passed|failed/last_run_id/qa_score/legal_passed/steps_completed/steps_total/deliverables_count/auto_approved/failure_reason/run_duration_ms/certified_at/metadata); OsPackCertificationService (PACK_FIXTURES 8 intakes válidos hardcoded — growth 3 con product_category/icp_title, beta 5 sufijo -pack; CertRunnerPort inyectable default lazy-require RUNNERS, tests mock; evaluateOutcome status passed sólo si completed+qa≥85+legal, qaScore=kpis.avg_qa_score, legalPassed=sku_results.every, deliverables=kpis.deliverables_published, steps done count; syncPackCatalog UPSERT 8 pending; runCertification dryRun=validate-only / run→evaluate→upsert auto_approved+certified_at, runner throw→failed; runAllCertifications secuencial; getCertification/listCertifications/getSummary passed/failed/pending/running; canPromoteToAvailable passed+certified_at<90d; promoteToAvailable assertCan+metadata.promoted_to_available; getPackAvailabilityFromCert read-only 'available'|null); APIs GET /api/os/packs/certifications {summary,items}, GET /[packId], POST /run {packId?} maxDuration 300, POST /promote {packId} (422 NOT_CERTIFIED) requirePlatformClaims force-dynamic; /os/packs/certifications page ProtectedLayout module=os KPIs passed/failed/pending/total + banner beta pending + tabla 8 packs status badge/QA/legal/steps/duración + Certificar todo/Re-certificar/Promover; helper getPackAvailabilityFromCert para SaasPackStoreService read-only NO auto-promote silencioso; 23 vitest tests (fixtures validan contra RUNNERS reales + evaluateOutcome + runCertification mock + promotion rules); beta→available sólo vía POST promote explícito; TS 0; suite verde | (current) |
| O16 | 20 Sectores 100% (Sector Readiness) — migration 464 (os_sector_readiness sector_id PK/label/sensitivity/regulated/seed_count/envato_count/agent_count/has_portal_template/has_qa_rubric/readiness_score/checklist JSONB/metadata JSONB); OsSectorReadinessService (SECTOR_CATALOG 20 verticales fijos id+label+sensitivity+regulated igual OS_SEEDS.md; SectorSeedPort inyectable default dynamic-import apps/web sectorSeeds getSeedByIndex+getSectorSeedCount, tests mock; computeReadiness scoring real no-mock seed+25/envato registry+15/agent prompt≥20chars+25/portal landing+meta+20/qa rubric+15 regulado→COMPLIANCE_MARKERS en prompt, no-regulado→N/A satisfecho; checklist 5 items; syncSectorCatalog UPSERT 20; refreshAll; listSectors ORDER score DESC; getSector NOT_FOUND; getSummary productionReady≥80+avgScore+regulatedCount; getReadinessScore lookup DB-only); APIs GET /api/os/sectors {summary,sectors}, GET /api/os/sectors/[sectorId], POST /api/os/sectors/refresh (requirePlatformClaims force-dynamic); /os/sectors page ProtectedLayout module=os KPIs sectores/production-ready/score-medio/regulados + grid 20 cards ScoreRing SVG color por score + sensitivity/regulado badges + checklist expand + link /os/seeds?sector; Hook packOrchestrator: seedMeta +sector_readiness_score vía getReadinessScore dynamic-import try/catch no-bloqueante; exportar service+SECTOR_CATALOG+tipos; 18 vitest tests; TS 0; suite verde | (current) |
| O15 | Envato Seed Library — migration 463 (os_envato_seed_registry id TEXT PK/sector/source CHECK envato\|synthetic/envato_id/headline/meta_title/cta_label/chatbot_greeting/preview_url/zip_path/downloaded_at/download_status CHECK metadata_only\|downloaded\|failed/metadata JSONB + INDEX sector+status); OsEnvatoSeedService (readMetadataFile ESM-safe path; syncFromMetadataFile UPSERT idempotente desde envato-seeds-metadata.json, skip id/sector/headline vacíos, downloaded_at→downloaded, nunca degrada downloaded→metadata_only vía CASE, xmax=0 inserted/updated count; listCatalog filtros sector/source/status limit≤500; getSeed NOT_FOUND; getSectorStats total/downloaded/metadata_only/failed por sector; markDownloaded zip_path+source envato; markFailed metadata.lastError); download-envato-seeds.ts +flags --lite (1/sector) / --sector / --limit + sin TOKEN exit 0 honesto (no throw CI) + sync registry si DATABASE_URL; APIs GET /api/os/seeds {stats,items} ?sector&status&limit (requirePlatformClaims), GET /api/os/seeds/[id], POST /api/os/seeds/sync {mode metadata\|download-lite} (download-lite→422 TOKEN_MISSING sin ENVATO_ELEMENTS_TOKEN); /os/seeds page ProtectedLayout module=os KPIs catálogo/descargados/sectores + filtro sector + grid cards (preview/headline/source badge/status badge) + botones Sync metadata/Download lite; metadata 500 commiteable, ZIPs gitignored backend/data/envato-seeds/**/*.zip; exportar service+tipos; 14 vitest tests; tsconfig+vitest include os-agents nested __tests__; TS 0; suite verde | (current) |
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
| S56 | SaaS PWA Elite — migration 462 (saas_pwa_installs id UUID PK/tenant_id/user_id/platform CHECK ios|android|desktop|unknown/display_mode/user_agent/installed_at + INDEX tenant+installed DESC); SaasPwaService (WhiteLabelPwaPort inyectable default lazy-require getSaasWhiteLabelService.getConfig, tests mock; buildManifest WL agencyName→name+short_name, primaryColor hex válido→theme_color (fallback #0084ff), logoUrl→icons 192/512 prepend + defaults, scope /saas start_url /saas/dashboard; getStatus manifestUrl /api/saas/pwa/manifest + fallbackManifestUrl /manifest-saas.json + appName + whiteLabel flag + stats; recordInstall INSERT platform/displayMode/userAgent; getInstallStats GROUP BY platform total+byPlatform+lastInstalledAt try/catch→0); APIs GET /api/saas/pwa/manifest (application/manifest+json, no-store, fallback default si unauth), GET /api/saas/pwa/status (ampliado con stats), POST /api/saas/pwa/install; /saas/layout.tsx manifest dinámico /api/saas/pwa/manifest + ServiceWorkerRegister montado; SaasPwaInstallPrompt POST install on accepted con detectPlatform; sw.js CACHE nelvyon-saas-v2 (purga v1); /saas/pwa Install Hub (estado instalada/no, WL marca+color, iOS hint Safari, botón instalar beforeinstallprompt, stats instalaciones/iOS/Android, nota fallback manifest); saasNav +pwa grupo cuenta; exportar SaasPwaService+9 tipos index.ts; 12 vitest tests; E2E saas-pwa-install.spec.ts 9 tests + mockSaasPwa fixture; fallback manifest-saas.json si API falla; TS 0; suite verde · **SaaS S1–S56 COMPLETE** | (current) |
| S55 | Voice Command SaaS — migration 461 (saas_voice_commands id UUID PK/tenant_id/user_id/transcript/matched_intent/action_type CHECK navigate|action|query|unknown/action_payload JSONB/success/error_message/source CHECK web_speech|media_upload + INDEX tenant+created DESC); SaasVoiceCommandService (VoiceNavCatalogPort inyectable default INTENT_CATALOG built-in 23 intents nav+action+query; normalizeTranscript strip acentos+lower+puntuación; parseTranscript scoring exact 100 / contains 60+len / partial 30+len + stripFillers verbos ES/EN "abre el", "go to"; unknown→success false + topSuggestions 3; getCatalog; logCommand INSERT; listHistory; executeCommand parse+log try/catch no rompe); APIs GET /api/saas/voice {catalog,history}, POST /voice/parse {result,intent,suggestions}, POST /voice/execute parse+log {success,route,intent,message}; SaasVoiceCommand.tsx FAB Web Speech API gratis (SpeechRecognition/webkit, es-ES, onresult→/voice/execute→router.push route con ?voice=action hint; mic denied→banner honesto; unsupported→no render) integrado en SaasShellLayout (todas /saas); /saas/voice page lista comandos por tipo + historial reciente + empty honesto; saasNav +voice grupo cuenta; exportar SaasVoiceCommandService+normalizeTranscript+7 tipos index.ts; 21 vitest tests; E2E saas-voice-command.spec.ts 9 tests + mockSaasVoice fixture; Web Speech primero cero coste, no LLM; TS 0; suite verde | (current) |
| S54 | Partner Zone Elite — migration 460 (saas_partner_retail_prices id UUID PK/agency_tenant_id/sku/wholesale_eur+retail_eur NUMERIC/currency/active/updated_at + UNIQUE agency+sku); SaasPartnerZoneService (orquestador con PartnerZonePorts inyectables subcuentas/whiteLabel/partners — singleton lazy-require getSaasSubcuentasService/getSaasWhiteLabelService/new SaasPartnersService, tests mockPorts; WHOLESALE_CATALOG v1 6 SKUs plan_starter/pro/agency + 3 packs wholesale+suggested retail; getPartnerEligibility plan agency|agency_partner; getWholesaleCatalog merge catalog + overrides 460 → marginEur+marginPct+hasOverride; upsertRetailPrice valida retail>=wholesale→VALIDATION, NOT_FOUND sku desconocido; listLedger UNION saas_connect_rebilling (tenant-scoped, wholesale=gross-net_agency) + partner_rebilling_ledger (workspace bridge) sort desc + totals gross/wholesale/margin; getConnectStatus delegate whiteLabel; startConnectOnboarding assertEligible+createAccount+onboardingUrl; getReferralStats/registerAsPartner delegate partners; getZoneSummary subcuentas activas+recientes+ledger totals+connect+referralCode); APIs GET /api/saas/partner {summary,connect,catalog,eligibility}, GET /partner/ledger (403 PARTNER_REQUIRED si no eligible) {entries,totals}, GET /partner/referrals (404 si no partner), POST /partner/register (upsell sin gate), PATCH /partner/retail-prices (403 gate + VALIDATION), POST /partner/connect/onboard (redirect URL / 503 si Stripe sin configurar honesto); /saas/partner page SaasShellLayout 6 tabs (Resumen KPIs subcuentas/margen/bruto/connect badge + CTA Conectar Stripe, Subcuentas mini-table + link /saas/subcuentas, Wholesale tabla SKU/wholesale/retail editable inline/margen/% con validación, Connect status charges+payouts+onboarding, Ledger totals+tabla gross/wholesale/margin, Referidos código copy + comisiones), upsell gate si no eligible "Mejorar a Agency Partner"→/saas/billing; saasNav +partner grupo cuenta (subcuentas/white-label intactos); dashboard +🤝 Abrir Partner Zone; exportar SaasPartnerZoneService+WHOLESALE_CATALOG+9 tipos index.ts; 20 vitest tests; E2E saas-partner-zone.spec.ts 12 tests + mockPartnerZone fixture; TS 0; suite verde | (current) |
| S53 | Data Playbooks — migration 459 (saas_data_playbooks id UUID PK/tenant_id/slug/title/trigger_reason/category CHECK growth|retention|ads|email|seo|compliance/priority INT/status CHECK suggested|active|dismissed|completed/context_snapshot+rendered_summary/pack_id/cta_href/timestamps + UNIQUE tenant+slug + INDEX tenant+status+priority DESC; saas_data_playbook_steps id UUID PK/playbook_id FK CASCADE/tenant_id/sort_order/step_type CHECK insight|action|email_draft|launch_pack|enable_autopilot|review_metric/title/body/metadata/completed + INDEX playbook+sort); SaasDataPlaybooksService (interpolate tokens {{company_name}}{{open_rate}}{{sector_avg_open}}{{roas}}{{qa_score}}{{pack_name}}{{compliance_pending}}; buildTenantContext agrega self-contained try/catch: saas_tenants company+industry→resolveIndustryKey, saas_campanias open/ctr 30d, saas_deliverable_revenue avg roas, saas_pack_launches qa+launches+top_pack, saas_benchmark_snapshots overallScore+sectorAvgOpen, saas_autopilot_settings enabled, saas_compliance_vault pending; generateFromContext 6 reglas determinísticas NO-LLM: open<sector→email, roas null|<1→ads attribution, launches 0|qa<85→launch pack, benchmark<50→close gaps, compliance pending→vault, autopilot off→enable; upsertGeneratedPlaybooks UNIQUE tenant+slug ON CONFLICT no resucita dismissed + rebuild steps; listPlaybooks/getPlaybook+steps/activate/dismiss/completeStep/completePlaybook/refreshPlaybooks/getSummary); Hook S49: executeLaunch al completed→getSaasDataPlaybooksService().refreshPlaybooks void try/catch; APIs GET /api/saas/data-playbooks {summary,playbooks}, POST /refresh, GET+PATCH /[id] (activate|dismiss|complete), PATCH /[id]/steps/[stepId] {completed}; /saas/playbooks page SaasShellLayout KPIs sugeridos/activos/completados, PlaybookCard (category badge, trigger ⚡, rendered_summary, expand steps con icono por step_type + CTA contextual launch_pack→brief-to-launch / enable_autopilot→autopilot / review_metric→benchmark, marcar paso ✓, Activar|Descartar|Completar), empty state honesto, toast; saasNav +data-playbooks grupo ia; dashboard +📋 Ver playbooks recomendados; exportar SaasDataPlaybooksService+13 tipos index.ts; 24 vitest tests; E2E saas-data-playbooks.spec.ts 11 tests + mockDataPlaybooks fixture; TS 0; suite verde | (current) |
| S52 | Pack Store — migration 458 (saas_pack_entitlements id UUID PK/tenant_id/pack_id/source CHECK plan|purchase|promo|admin/status CHECK active|expired|revoked/launches_remaining INT NULL=ilimitado/launches_used/stripe_payment_intent_id/metadata JSONB/granted_at/expires_at/updated_at + UNIQUE INDEX tenant+pack WHERE active + INDEX tenant+status); SaasPackStoreService (PackCatalogPort inyectable — singleton lazy-import servicePacksCatalog, tests fixture; PLAN_DEFAULTS starter=local 1/pro=3 growth ×2/agency=3 unlimited null; listEntitlements; grantFromPlan UPSERT ON CONFLICT WHERE active; canLaunch entitlement+quota→PACK_LOCKED|QUOTA_EXHAUSTED; consumeLaunch launches_used+1 launches_remaining GREATEST-1; recordPurchase upsert source purchase|promo unlimited; revokeEntitlement; getStoreCatalog merge catalog+entitlements+plan→access included|owned|purchasable|coming_soon+canLaunch; getStoreSummary totals+owned+launchesRemaining null si unlimited; getPackDetail item+canLaunch+recentLaunches); Hook S49: SaasBriefToLaunchService +EntitlementPort inyectable (3er constructor param, skip si no wired→tests intactos), createLaunch canLaunch antes de insert→VALIDATION, executeLaunch consumeLaunch void try/catch al completed; APIs GET /api/saas/packs {summary,catalog,entitlements}, GET /api/saas/packs/[packId] detalle, POST /api/saas/packs/[packId]/purchase (coming_soon→403 PACK_LOCKED / included→grantFromPlan / promo→recordPurchase / add-on→checkoutRequired billing honesto sin mock), POST /api/saas/packs/sync-plan re-grant; /saas/packs page SaasShellLayout summary KPIs (catálogo/disponibles/en-cuenta/lanzamientos ∞), filtros categoría+availability, grid PackCard (badge access, outputs chips, estimatedMinutes, CTA Lanzar ahora→/saas/brief-to-launch?packId / Comprar|Activar / Unirme beta / En desarrollo disabled coming_soon), toast; brief-to-launch preselect packId desde query; dashboard +🛒 Explorar packs quick action; saasNav +pack-store grupo ia; exportar SaasPackStoreService+11 tipos index.ts; 24 vitest tests; E2E saas-pack-store.spec.ts 12 tests + mockPackStore fixture; TS 0; suite verde | (current) |
| S51 | Sector Benchmark — migration 457 (saas_benchmark_snapshots id UUID PK/tenant_id/sector_key/sector_label/period_days INT DEFAULT 30/client_metrics+industry_metrics+comparisons+summary+data_sources JSONB/degraded BOOLEAN/computed_at + INDEX tenant_id+computed_at DESC); SaasSectorBenchmarkService (static import getBenchmark+resolveIndustryKey from os-agents/benchmarks/industryBenchmarks; METRIC_DEFS email_open_rate/email_click_rate/conversion_rate/roas/cpc/qa_score con higherBetter+channel+unit; listSectors; resolveTenantSector saas_tenants.industry→resolveIndustryKey; collectClientMetrics best-effort try/catch por fuente: saas_campanias open/click rate, saas_lead_attribution conversion rate, saas_ads_metrics_cache roas+cpc, nelvyon_pack_runs qa_score vía workspace_id bridge; getIndustryMetrics getBenchmark por métrica (qa_score null); compareMetrics deltaPct + rating excelente/bueno/mejorable/critico con inversión para lower-better cpc; buildDashboard auto-collect→compare→summary overallScore; saveSnapshot/getLatestSnapshot/refreshBenchmark); APIs GET /api/saas/benchmarks/sectors, GET /api/saas/benchmarks/industry/[sector], POST /api/saas/benchmarks/compare (auto-collect no persist), GET /api/saas/benchmark (latest snapshot o build), POST /api/saas/benchmark/refresh (build+persist); /saas/benchmark page SaasShellLayout sector badge, KPI summary (overallScore/comparadas/sobre-media/bajo-media), recharts BarChart Tú vs Industria con Cell color por rating, tabla comparativa Δ% coloreado + rating badge, degraded banner, fuentes footer, empty state honesto auto-collect; saasNav +benchmark grupo ia; exportar SaasSectorBenchmarkService+9 tipos index.ts; 27 vitest tests; E2E saas-sector-benchmark.spec.ts 11 tests + mockSectorBenchmark fixture; TS 0; suite verde | (current) |
| S50 | Compliance Vault — migration 456 (saas_compliance_vault id UUID PK/tenant_id/deliverable_source CHECK os|recurring|pack_run/deliverable_ref/pack_run_id UUID FK nelvyon_pack_runs ON DELETE SET NULL/pack_id/title/consent_type TEXT CHECK gdpr_marketing|gdpr_data_processing|sector_disclaimer|client_approval|qa_certificate|other DEFAULT client_approval/legal_doc_url/qa_pdf_url/content_hash/status TEXT CHECK pending|verified|expired|revoked DEFAULT pending/metadata JSONB/verified_by/created_at/updated_at/verified_at/expires_at + UNIQUE INDEX tenant+source+ref+consent_type + INDEX tenant+status+created_at DESC); SaasComplianceVaultService (computeContentHash sha256 hex; getVaultSummary GROUP BY status+expiring_count <NOW()+30d; listArtifacts ORDER created_at DESC LIMIT 50 with optional status/consentType/packId/days filters; getArtifact NOT_FOUND; syncFromPackRun reads nelvyon_pack_runs+report JSONB→UPSERT consent_type=qa_certificate status=verified if legalPassed=true; syncFromDeliverablesHub bridge workspace_id→os_deliverables+pack_runs+recurring batch skip errors; attachDocument dynamic SET params; verifyArtifact status=verified+verified_at+verified_by throws ALREADY_VERIFIED if revoked; revokeArtifact status=revoked+metadata reason merge); getSaasComplianceVaultService singleton + reset for tests; Hook S49 SaasBriefToLaunchService.executeLaunch after completed: void syncFromPackRun try/catch; APIs GET /api/saas/compliance →{summary, artifacts}; POST /api/saas/compliance/sync body {packRunId?}→syncFromPackRun|syncFromDeliverablesHub; GET/PATCH /api/saas/compliance/[artifactId] GET→getArtifact PATCH action=attach|verify|revoke; /saas/compliance page SaasShellLayout KPI row total/pendientes/verificados/expiran-pronto, table título-ref/pack/consent_type/QA score/legal ✅❌/status badge/hash truncado 8ch/doc links 📄📊, row click→ArtifactModal (metadata JSON, portal link pack_run_id, Verificar+Revocar actions), toast 3s, empty state honesto link Lanzar Pack; saasNav.ts +compliance SaasNavId+item grupo ia; exportar SaasComplianceVaultService+7 tipos index.ts; 21 vitest tests; E2E saas-compliance-vault.spec.ts 14 tests; TS 0; suite verde | (current) |
| S49 | Brief-to-Launch — migration 455 (saas_pack_launches id UUID PK/tenant_id/pack_id/pack_run_id UUID FK nelvyon_pack_runs ON DELETE SET NULL/brief JSONB/status TEXT CHECK queued|running|completed|failed|cancelled DEFAULT queued/progress_pct INT 0-100/error_message/portal_url/created_by/created_at/updated_at/completed_at + INDEX tenant_id+created_at DESC); runnersMap.ts extracted from kickoff route (shared RUNNERS for route + service); SaasBriefToLaunchService (PackRunnerPort injectable; listAvailablePacks filter coming_soon; createLaunch INSERT queued VALIDATION; executeLaunch: lookup launch→resolve workspace_id→mark running→runner.getRunner→run→UPDATE completed+pack_run_id+portal_url / failed on error; getLaunchStatus: launch+pack_run steps+qaScore+reportUrl; listLaunches ORDER created_at DESC LIMIT; syncLaunchFromPackRun: steps done/total→progress_pct+status running|completed|failed); APIs GET /api/saas/brief-to-launch→catalog+launches; POST→createLaunch+executeLaunch async void; GET /api/saas/brief-to-launch/[launchId]→getLaunchStatus; /saas/brief-to-launch page SaasShellLayout: wizard 4 pasos (select pack/brief form/running progress/done), pack cards available+beta (beta→waitlist message honesto), BriefForm dinámica por packId (5 campos con required validation), ProgressBar polling 3s getLaunchStatus, result screen QA score+links entregables+portal+reportes, Lanzar otro pack reset; saasNav.ts +brief-to-launch SaasNavId grupo ia; exportar SaasBriefToLaunchService+PackRunnerPort+7 tipos index.ts; 24 vitest tests; E2E saas-brief-to-launch.spec.ts 12 tests; TS 0; suite 121/1703 | (current) |
| S48 | Revenue per Deliverable — migration 454 (saas_deliverable_links tenant_id+deliverable_id PK/deliverable_source CHECK os|recurring|pack_run/utm_campaign/external_campaign_id/landing_url; saas_deliverable_revenue id UUID PK/tenant_id/deliverable_id/source/pack_id/utm_campaign/period_start+end DATE/visits+conversions INT/attributed_revenue+ads_spend NUMERIC(12,2)/roas NUMERIC(8,4)/model TEXT DEFAULT last_touch/computed_at TIMESTAMPTZ + UNIQUE tenant+deliverable+period+model); SaasDeliverableRevenueService (linkDeliverable UPSERT saas_deliverable_links VALIDATION empty id; computeRevenue: link lookup→attr query saas_lead_attribution?utmCampaign→deals avg crm_deals fallback env REVENUE_PER_CONVERSION_DEFAULT|500→spend saas_ads_metrics_cache+connections+campaign_links?utmCampaign→roas=rev/spend if spend>0 else null→UPSERT saas_deliverable_revenue RETURNING; listRevenueByDeliverable ORDER attributed_revenue DESC; getPackRevenueSummary GROUP BY pack_id; refreshAll loop deliverable_links batch errors[]); APIs GET /api/saas/entregables/revenue?days&model→listRevenueByDeliverable; POST action=refresh→refreshAll / link→linkDeliverable; GET /api/saas/entregables/revenue/[id]?packId→computeRevenue+getPackRevenueSummary parallel; /saas/entregables ampliado: tabs Lista|Revenue€, KPI strip +Revenue atribuido +ROAS medio, Revenue tab tabla entregable/pack/conv/spend/revenue/ROAS ≥2x verde, ↻ Recalcular btn, "Vincular campaña" modal UTM+landingUrl per row; /saas/reportes sección "Revenue por entregable" top5 tabla conv/spend/revenue/ROAS; exportar SaasDeliverableRevenueService+types index.ts; 18 vitest tests SaasDeliverableRevenueService.s48; E2E saas-deliverable-revenue.spec.ts 13 tests; TS 0; suite 120/1679 | (current) |
| S47 | Autopilot Command Center — migration 453 (saas_autopilot_settings tenant_id PK/seo_enabled/social_enabled/reputation_enabled/ads_enabled BOOLEAN DEFAULT false/seo_day_of_month INT 1-28 DEFAULT 1/social_day_of_month INT 1-28 DEFAULT 1/last_seo_run_at/last_social_run_at/last_reputation_run_at/last_ads_run_at TIMESTAMPTZ/updated_at; 2 partial indexes seo_enabled+social_enabled); SaasAutopilotService (getSettings UPSERT defaults; updateSettings PATCH validation day 1-28 dynamic fieldMap; getStatus settings+activeCount+nextSeoRun+nextSocialRun computed; runNow seo→generateMonthlyDeliverables+markLastRun / social→generateMonthly+mark / reputation→syncGbpReviews+mark / ads→listConnections+getMetrics loop non-fatal+mark; listEligibleTenants OR all 4 toggles); cron /api/cron/os-recurring-services extendido: eligibleAutopilot query type-filtered + legacy tenants (no autopilot row) all-types backward-compat; APIs GET/PATCH /api/saas/autopilot (contacts.read GET / settings.write PATCH), POST /api/saas/autopilot/run {service} settings.write; /saas/autopilot page SaasShellLayout: KPI strip (servicios activos/entregables este mes/link Ver entregables), 4 ServiceToggleCard (toggle ON/OFF→PATCH / día del mes / última ejecución / próxima / hint si desconectado / btn Ejecutar ahora disabled when OFF), toast runNow result; saasNav.ts +autopilot SaasNavId grupo ia; exportar 5 tipos index.ts; 21 vitest tests; E2E saas-autopilot.spec.ts 8 tests; TS 0; suite 117/1639 | 00054e65→ |
| S46 | Deliverables Hub — sin migración (usa tablas existentes os_deliverables+saas_recurring_deliverables+nelvyon_pack_runs+saas_tenants.workspace_id); SaasDeliverablesHubService (listDeliverables: JOIN workspace_id→SELECT os_deliverables+recurring+pack_runs completed, UNION merge+sort DESC, filters type/status/days; getDeliverable: lookup os→recurring→pack_run fallback, NOT_FOUND error; getSummary: counts total/pendingReview/approved/avgQaScore/byType/byStatus); type DeliverableSource os|recurring|pack_run; type DeliverableType landing|seo|ads|chatbot|report|certificate|social_calendar|other; APIs /api/saas/entregables GET?type&status&days (list+summary paralelo); /api/saas/entregables/[id] GET+POST action resend_portal_link|open_in_portal (audit log); /saas/entregables page SaasShellLayout KPI strip 4 cards (total/pendingReview/aprobados/QA media), filtros tipo+estado+días, tabla icono/título/packId/QA badge verde≥85/status badge/fecha/acciones (Ver portal+Descargar+Copiar link), empty state hint "Ejecuta un pack OS…"; saasNav.ts +entregables SaasNavId+item grupo cuenta; exportar 6 tipos en backend/saas/index.ts; 20 tests SaasDeliverablesHubService.s46; E2E saas-entregables.spec.ts 11 tests; TS 0; suite 116/1618 | da52d8d2→ |
| S44 | CPQ enterprise — migration 452 (saas_contracts contractNumber/title/clientName/clientEmail/currency/amount/billingInterval CHECK month|year|one_time/status CHECK draft|sent|signed|active|expired|cancelled/signedAt/startsAt/endsAt/autoRenew/termsHtml/signatureToken UNIQUE DEFAULT hex 4 indexes; saas_dunning_events invoiceId/attemptNumber/channel CHECK email|sms/status CHECK pending|sent|failed|skipped/scheduledAt/sentAt/errorMessage; saas_exchange_rates base+target PK seeded 7 pairs; ALTER saas_quotes +currency; ALTER invoices +currency +fx_rate_applied); SaasCpqEnterpriseService (createContract VALIDATION, createContractFromQuote INVALID_STATUS if not accepted, getContractByToken, signContract UPDATE draft|sent→signed, sendContract SES signUrl non-fatal, cancelContract, renewContract, listContracts, getContract, scheduleDunning 3 events D+3+D+7+D+14, processDueDunning JOIN invoices→SES→UPDATE sent|failed, getDunningSummary overdueCount+nextAction, getDunningEvents, getExchangeRate same→1/cached/API key fallback/1:1, convertQuoteCurrency); APIs /api/saas/contracts GET+POST, /api/saas/contracts/[id] GET+PATCH send|cancel|renew, /api/public/contracts/sign/[token] GET+POST, /api/saas/facturas/dunning GET+POST, /api/cron/saas-dunning CRON_SECRET, /api/saas/quotes/convert-currency GET; Pipeline page tab Contratos (grid+badge tones success|primary|warning|neutral|danger, btn Enviar); Facturas page dunning banner overdueCount+totalOverdueAmount+btn 🔔 Recordatorio overdue rows; /contracts/sign/[token] página pública GET+POST sign+success screen; 22 tests SaasCpqEnterpriseService.s44; TS 0; suite 115/1587 | (current) |
| S43 | Membership hub — tiers, gated LMS, affiliate payouts bridge: migration 451 (saas_membership_plans tenant_id/name/slug/price_amount/price_currency/billing_interval CHECK month|year|lifetime/includes JSONB {courses[],communities[],features[]}/affiliate_commission_pct/is_active/stripe_price_id UNIQUE tenant+slug; saas_membership_members tenant_id/plan_id FK CASCADE/contact_id/contact_email/status CHECK active|cancelled|expired/stripe_subscription_id/starts_at/expires_at/affiliate_ref UNIQUE tenant+email+plan; saas_membership_access tenant_id/member_id FK CASCADE/resource_type CHECK course|community/resource_id; ALTER saas_lms_courses +membership_plan_id FK; ALTER communities +required_plan_id FK; 4 indexes); SaasMembershipService (listPlans activeOnly, createPlan name+slug+price+billing+includes+commissionPct+stripePriceId, updatePlan patch, deletePlan, subscribeMember UPSERT member+grant access rows course/community+affiliate trackConversion hook, listMembers planId filter, cancelMember UPDATE status, updateMemberStatus by stripeSubId, checkAccess direct grant OR JSONB includes, getMemberPortal active plans+courses+communities); SaasLmsService.enroll gating: SELECT membership_plan_id→if set call checkAccess→MEMBERSHIP_REQUIRED; SaasCommunitiesService.createPost gating: SELECT required_plan_id→if set call checkAccess→MEMBERSHIP_REQUIRED; /api/saas/memberships GET {plans}|?resource=members|access|portal + POST action=create_plan|subscribe|cancel; /api/saas/memberships/[planId] PATCH+DELETE; /api/webhooks/stripe-membership subscription.created/deleted→updateMemberStatus; /saas/memberships page 3 tabs (Planes grid CRUD CreatePlanModal, Miembros tabla contact/plan/status/fechas/cancelar, Afiliados KPIs+tabla comisiones por ventas membership); saasNav.ts +memberships SaasNavId; 23 tests SaasMembershipService.s43 + 3 tests SaasLmsMembershipGating.s43; LmsService.test enroll mock actualizado; TS 0; suite 114/1565 | (current) |
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
