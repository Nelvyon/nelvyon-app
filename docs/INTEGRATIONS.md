# INTEGRATIONS — Estado de integraciones

> Catálogo código: `backend/saas/integrationsCatalog.ts`  
> Actualizado: **2026-07-24**. **✅ = verificado en prod** · **🟡 = código/vars** · **❌ = no implementado**

**Bloqueadores go-live:** legal campañas (dossier Pepito + licencia escrita). Prod IA **ABSENT**. Staging live ADR-055: 13 packs+auditor ALL_PASS · automations/reputation E2E ALL_PASS · SM/MCP synthetic ON. SSOT: `OS_CATALOG_V1.md` v1.2.0.

### Auth bridge Web ↔ FastAPI

| Ítem | Estado |
|------|--------|
| OpenAI | allow **0** |
| Mesh / packs | E2E ALL_PASS ADR-055 staging live (13 packs) · tip `53149384` |
| OpenClaw | staging_mock ON · prod canary **PENDING_CEO** |
| Auditor | staging ON · prod OFF |
| Visual spend | **OFF** · creative_direction + decision matrix |
| Paid social / publish | **PREPARED_OFF** |
| Social oficial NELVYON | **PREPARED_OFF** · `NelvyonOfficialSocialOps` · 8 cuentas PENDING_CEO |
| SM/MCP productivo | **OFF** (0) |
| SM/MCP synthetic staging | **ON** · `NELVYON_SHARED_MEMORY_STAGING=1` + `NELVYON_MCP_STAGING_SYNTHETIC=1` · harness unit tests PASS · no implica SM/MCP productivo |
| Datos Pepito / company DB campañas | **forbidden** · BLOQUEADO_LEGAL · `DATOS_PEPITO_LICENSE_DOSSIER` |

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
| **Google Ads** | 🟡 | `GOOGLE_ADS_*`, OAuth `GOOGLE_CLIENT_ID/SECRET` | `GoogleAdsService.ts` |
| **Meta Ads** | 🟡 | `META_*`, `META_ACCESS_TOKEN`, `META_WA_*` | `MetaAdsService.ts` |
| **LinkedIn Ads** | 🟡 | `LINKEDIN_CLIENT_ID/SECRET` | `LinkedInAdsService.ts` |
| **TikTok Ads** | 🟡 | `TIKTOK_APP_ID/SECRET`, `TIKTOK_ACCESS_TOKEN` | `TikTokAdsService.ts` |
| Snapchat | 🟡 | `SNAPCHAT_*` | Catálogo |

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
| Twilio SMS | 🟡 | `TWILIO_*` | Dialer/inbox |
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
| OpenAI | 🟡 | `OPENAI_API_KEY` + `AUTONOMOUS_ALLOW_OPENAI=1` | **OFF default.** Autonomous + OS `LlmClient` (ADR-034): opt-in only; PRIVATE_MODE blocks egress. Ollama primary. |
| Anthropic | 🟡 | `ANTHROPIC_API_KEY` | Private AI provider |
| Ollama (local) | ✅ | `OLLAMA_HOST` / `:11434` · `OLLAMA_STRATEGY_MODEL` | Primary autonomous/OS path. Quality routing opt-in: `AUTONOMOUS_QUALITY_ROUTING=1` (ADR-036). **Prohibido** staging→`localhost` PC. Mesh: ver `ARCHITECTURE_LOCAL_AI_RUNTIME.md` (no activado). |
| Local-ai Postgres/pgvector | 🟡 | Compose `127.0.0.1:5434` | Ingest **verified** hist. · Docker **DOWN** 2026-07-22 (HTTP pack E2E BLOCKED) |
| **MCP Productivo** | ✅ | `NELVYON_MCP_PRODUCTIVE_ENABLED` | `/api/saas/mcp` — **CERTIFIED** (`mcp_certification_final.json`) · **OFF** en runtime |
| **MCP Staging synthetic** | ✅ | `NELVYON_MCP_STAGING_SYNTHETIC` | ADR-055 harness · flags **ON** staging · productivo **0** · harness unit tests PASS |
| **OpenClaw** | 🟡 | `NELVYON_OPENCLAW_BRIDGE_*` + Memory | staging_mock deepened · prod canary PENDING_CEO |
| **Shared Memory productivo** | 🟡 | `NELVYON_SHARED_MEMORY_ENABLED` | Flag **OFF** default · schema 514/515 verified staging |
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
