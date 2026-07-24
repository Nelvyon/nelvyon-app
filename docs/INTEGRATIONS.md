# INTEGRATIONS — Estado de integraciones

> Catálogo código: `backend/saas/integrationsCatalog.ts`  
> Actualizado: **2026-07-24** (**ADR-057 Blocks 11–25 complete**). **✅ = verificado** · **🟡 = código/vars** · **❌ = no implementado**

**Bloqueadores go-live:** CEO checklists (telephony · OAuth · ads · publish · mobile · IA canary) · legal Pepito (mass-send **BLOCKED_LEGAL**). Prod flags **OFF**. Staging: https://ideal-victory-staging.up.railway.app · **confirm deploy after push**. SSOT: `OS_CATALOG_V1.md` v**1.4.0**.

### Auth bridge Web ↔ FastAPI

| Ítem | Estado |
|------|--------|
| OpenAI | allow **0** · ADR-056: `isOpenAiSpendAllowed` gates chat+ai-copy |
| Mesh / packs | E2E ALL_PASS ADR-055 staging runtime (13 packs) · tip `53149384` · ADR-056 meta-ads-pack beta OAuth OFF |
| OpenClaw | staging_mock ON · prod canary **PENDING_CEO** |
| Auditor | staging ON · prod OFF |
| Visual spend | **OFF** · creative_direction + decision matrix |
| Paid social / publish | **PREPARED_OFF** |
| Social oficial NELVYON | **PREPARED_OFF** · `NelvyonOfficialSocialOps` · 8 cuentas PENDING_CEO |
| SM/MCP productivo | **OFF** (0) |
| SM/MCP synthetic staging | **ON** · `NELVYON_SHARED_MEMORY_STAGING=1` + `NELVYON_MCP_STAGING_SYNTHETIC=1` · harness unit tests PASS · no implica SM/MCP productivo |
| Datos Pepito / company DB campañas | **forbidden** · BLOQUEADO_LEGAL · `DATOS_PEPITO_LICENSE_DOSSIER` · ADR-056 P0 launch block |
| Campaign mass-send | **legally blocked** · Block 15 controls verified · `claimReadyLegal=false` |

### ADR-057 — Agency cores (Blocks 11–17)

| Block | Módulo | Core | Externo |
|-------|--------|------|---------|
| 11 | `TelephonyCore` | simulator **IMPLEMENTED_VERIFIED** | Twilio real **BLOCKED_EXTERNAL** · `TELEPHONY_PROVIDER_CEO_CHECKLIST.md` |
| 13 | `AdsAttributionCore` | core **IMPLEMENTED_VERIFIED** | spend/OAuth **BLOCKED_EXTERNAL** · `NELVYON_ADS_SPEND_ENABLED=0` |
| 14 | `CommunityPublishCore` | simulator **IMPLEMENTED_VERIFIED** | publish **BLOCKED_EXTERNAL** · `SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md` |
| 16 | `OAuthMultiTenantFramework` | mock **IMPLEMENTED_VERIFIED** | real apps **BLOCKED_EXTERNAL** · `OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md` |
| 17 | `IntegrationsMarketplaceV1` | internal ping **IMPLEMENTED_VERIFIED** | external publish rejected |

---

## Pagos

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| **Stripe** | ✅ | `STRIPE_*` | Live sk + webhook; price-audit **allValid=true** (KI-R028); `AGENCY_PARTNER` opcional ausente · **OK** |
| Shopify | 🟡 | OAuth + `ShopifyService.ts` | Commerce |

---

## Email

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| **AWS SES** | ✅ | `SES_*` | Production GRANTED 2026-07-21 · self-send · SNS OK |
| SendGrid | 🟡 | `SENDGRID_API_KEY` | Fallback Python paths |

---

## Ads

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| **Google Ads** | 🟡 | `GOOGLE_ADS_*`, OAuth `GOOGLE_CLIENT_ID/SECRET` | `GoogleAdsService.ts` · **no live OAuth spend path** (ADR-056) |
| **Meta Ads** | 🟡 | `META_*`, `META_ACCESS_TOKEN`, `META_WA_*` | `MetaAdsService.ts` · **no live OAuth spend path** · `meta-ads-pack` beta OAuth OFF |
| **LinkedIn Ads** | 🟡 | `LINKEDIN_CLIENT_ID/SECRET` | `LinkedInAdsService.ts` |
| **TikTok Ads** | 🟡 | `TIKTOK_APP_ID/SECRET`, `TIKTOK_ACCESS_TOKEN` | `TikTokAdsService.ts` |
| Snapchat | 🟡 | `SNAPCHAT_*` | Catálogo |

**Ads & attribution CORE (Block 13, 2026-07-24, uncommitted):** `backend/agency/AdsAttributionCore.ts` añade un core sintético independiente (campaign draft, audiencias, UTM, conversion events, budget cap, reporting) con conectores propios `GoogleAdsConnector`/`MetaAdsConnector`/`LinkedInAdsConnector` **fail-closed** — `connect()`/`spend()` siempre lanzan `BLOCKED_EXTERNAL`/`SPEND_DISABLED`, independientemente de los servicios `*AdsService.ts` de la tabla anterior. `NELVYON_ADS_SPEND_ENABLED` default **0**. Ver `docs/ops/ADS_OAUTH_SPEND_CEO_CHECKLIST.md`.

---

## Analytics

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| Google Analytics 4 | 🟡 | OAuth Google | `GoogleAnalytics4Service.ts` |
| Search Console | 🟡 | OAuth Google | `GoogleSearchConsoleService.ts` |
| PostHog | 🟡 | `NEXT_PUBLIC_POSTHOG_*`, `POSTHOG_KEY` | EU GDPR |
| Semrush | 🟡 | `SEMRUSH_API_KEY` | SEO |

---

## Comunicaciones

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| **WhatsApp Business** | 🟡 | `META_WA_PHONE_NUMBER_ID`, `META_WA_ACCESS_TOKEN`, `META_WA_VERIFY_TOKEN` | Cloud API |
| **Telegram** | 🟡 | Bot token por usuario en `integration_telegram` | `TelegramService.ts` |
| Twilio SMS / Dialer | 🟡 | `TWILIO_*` | Block 11: `TelephonyCore` simulator verified · `TwilioTelephonyProvider` constructor **always throws BLOCKED_EXTERNAL** · legacy `TwilioService.ts` untouched · **no GHL telephony parity** |
| **Discord** | ❌ | — | Solo copy agentes OS |
| **Slack** | 🟡 | Workflow `notify_slack`; approval channels API | Sin OAuth service dedicado |

---

## Google Workspace

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| **Gmail API** | ❌ | — | Solo branding/docs |
| **Google Calendar** | 🟡 | OAuth Google, `GOOGLE_CALENDAR_ID` | `calendar_service.py` |
| Google Drive | ❌ | — | No servicio |
| Google Docs | ❌ | — | No servicio |
| Google Sheets | 🟡 | Menciones agentes import | Sin API dedicada |

---

## CRM / Productividad

| Integración | Estado | Notas |
|-------------|--------|-------|
| HubSpot | 🟡 | OAuth + sync push (486) |
| Salesforce | 🟡 | Catálogo |
| Zapier / Make | 🟡 | Webhooks públicos |
| **n8n** | 🟡 | Blueprint JSON; sin servidor |

---

## IA

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| OpenAI | 🟡 | `OPENAI_API_KEY` + `AUTONOMOUS_ALLOW_OPENAI=1` | **OFF default.** ADR-056: `isOpenAiSpendAllowed` gates chat+ai-copy. Autonomous + OS `LlmClient` (ADR-034): opt-in only; PRIVATE_MODE blocks egress. Ollama primary. |
| Anthropic | 🟡 | `ANTHROPIC_API_KEY` | Private AI provider |
| Ollama (local) | ✅ | `OLLAMA_HOST` / `:11434` · `OLLAMA_STRATEGY_MODEL` | Primary autonomous/OS path. Staging: `http://100.102.207.30:11434` (Tailscale CGNAT private — not public). Quality routing opt-in: `AUTONOMOUS_QUALITY_ROUTING=1` (ADR-036). **Prohibido** staging→`localhost` PC. Mesh: ver `ARCHITECTURE_LOCAL_AI_RUNTIME.md`. |
| Local-ai Postgres/pgvector | 🟡 | Compose `127.0.0.1:5434` | Block 24: synthetic RAG **IMPLEMENTED_VERIFIED** · pgvector Docker live **PREPARED_OFF** · `PRIVATE_RAG_RUNBOOK.md` |
| **MCP Productivo** | ✅ | `NELVYON_MCP_PRODUCTIVE_ENABLED` | `/api/saas/mcp` — **CERTIFIED** (`mcp_certification_final.json`) · **OFF** en runtime · ADR-056: `mcp.write` no longer invented |
| **MCP Staging synthetic** | ✅ | `NELVYON_MCP_STAGING_SYNTHETIC` | ADR-055 harness · flags **ON** staging · productivo **0** · harness unit tests PASS |
| **OpenClaw** | 🟡 | `NELVYON_OPENCLAW_BRIDGE_*` + Memory | staging_mock deepened · prod canary PENDING_CEO |
| **Shared Memory productivo** | 🟡 | `NELVYON_SHARED_MEMORY_ENABLED` | Flag **OFF** default · schema 514/515 verified staging · ADR-056: scopes split |
| **Shared Memory staging synthetic** | ✅ | `NELVYON_SHARED_MEMORY_STAGING` | ADR-055 harness · flags **ON** staging · productivo **0** · no implica SM productiva |

---

## Problemas comunes

| Problema | Integración | Acción |
|----------|-------------|--------|
| Webhook 503 | Stripe | `STRIPE_WEBHOOK_SECRET` |
| Banner amber campañas | SES | Configurar SES_* |
| OAuth redirect mismatch | Google/Meta | Alinear `*_REDIRECT_URI` con `NEXT_PUBLIC_APP_URL` |
| WA no envía | Meta | `META_WA_*` + plantillas aprobadas |

---

## Tests de integración

Ubicación: `backend/integrations/__tests__/`, `backend/saas/__tests__/SaasIntegrationsHubService.*`
