# INTEGRATIONS — Estado de integraciones

> Catálogo código: `backend/saas/integrationsCatalog.ts`  
> Actualizado: 2026-07-09. **Prod deploy:** `815e4c0f`. **✅ = verificado en prod** · **🟡 = código/vars** · **❌ = no implementado**

---

## Pagos

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| **Stripe** | 🟡 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_*`, `STRIPE_WEBHOOK_CONNECT_SECRET` | Webhooks `/api/webhooks/stripe` |
| Shopify | 🟡 | OAuth + `ShopifyService.ts` | Commerce |

---

## Email

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| **AWS SES** | 🟡 | `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL` | Primario prod |
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
| OpenAI | 🟡 | `OPENAI_API_KEY` | Packs, LlmClient |
| Anthropic | 🟡 | `ANTHROPIC_API_KEY` | Private AI provider |
| Ollama (local) | 🟡 | `OLLAMA_CONFIGURED` | Private AI |
| **OpenClaw** | ❌ | `NELVYON_OPENCLAW_BRIDGE_*` | Bridge deshabilitado |

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
