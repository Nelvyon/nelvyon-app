# INTEGRATIONS — Estado de integraciones

> Catálogo código: `backend/saas/integrationsCatalog.ts`  
> Actualizado: **2026-07-23**. **✅ = verificado en prod** · **🟡 = código/vars** · **❌ = no implementado**

**Bloqueadores go-live:** legal campañas. Prod IA **ABSENT**. Staging mesh Pack E2E ALL_PASS. OS catalog: `OS_UNIVERSAL_SERVICE_CATALOG.md`. Free tools: eval only (`FREE_TOOLS_EVALUATION.md`).

### Auth bridge Web ↔ FastAPI

| Ítem | Estado |
|------|--------|
| OpenAI | allow **0** · revoked |
| Mesh Option A | Ollama privado PASS · Pack E2E ALL_PASS · ADR-044–047 |

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
| **MCP Productivo** | ✅ | `NELVYON_MCP_PRODUCTIVE_ENABLED` | `/api/saas/mcp` — **CERTIFIED** (`mcp_certification_final.json`) |
| **OpenClaw** | 🟡 | `NELVYON_OPENCLAW_BRIDGE_*` + Memory | HttpOpenClawBridge listo; OFF hasta ops URL |
| **Shared Memory** | 🟡 | `NELVYON_SHARED_MEMORY_ENABLED` | Flag **OFF** default · schema 514/515 en repo · **schema not verified on staging** (Bloque 2 BLOCKED 2026-07-20: DATABASE_URL unset · verify exit 2 · migrate NOT run) |

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
