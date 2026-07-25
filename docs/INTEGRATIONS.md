# INTEGRATIONS — Estado de integraciones

> Catálogo código: `backend/saas/integrationsCatalog.ts`  
> Actualizado: **2026-07-25** (ADR-061 VERIFIED staging). **✅ = verificado** · **🟡 = código/vars** · **❌ = no implementado**  
> **Sin OAuth real inventado.** Mock OAuth framework = VERIFIED; apps reales = BLOCKED_EXTERNAL.  
> **Sin Odoo** · **sin** full ERP/accounting/finance · ERP non-financial cores = NELVYON + Postgres `erp_domain_snapshots` SSOT (catalog **v1.7.0** · staging tip **`9e931f08`**).

**Bloqueadores go-live:** CEO checklists (telephony · OAuth · ads · publish · mobile · IA canary) · legal Pepito (mass-send **BLOCKED_LEGAL**). Prod flags **OFF**. Staging tip **`9e931f08`** · deploy **`794662d7` SUCCESS**. SSOT: `OS_CATALOG_V1.md` v**1.7.0**.

### Auth bridge Web ↔ FastAPI

| Ítem | Estado |
|------|--------|
| OpenAI | allow **0** · ADR-056: `isOpenAiSpendAllowed` gates chat+ai-copy |
| Mesh / packs | E2E packs ADR-055 staging · influencers **VERIFIED** · `AUTONOMOUS_ALLOW_OPENAI=0` |
| OpenClaw | staging_mock ON · prod canary **PENDING_CEO** |
| Auditor | staging ON · prod OFF |
| Visual spend | **OFF** · creative_direction + decision matrix |
| Paid social / publish | core/sim **VERIFIED** · real publish **BLOCKED_EXTERNAL** (no fake OAuth) |
| Social oficial NELVYON | **PREPARED_OFF** · `NelvyonOfficialSocialOps` · 8 cuentas PENDING_CEO |
| SM/MCP productivo | **OFF** (0) |
| SM/MCP synthetic staging | **ON** · harness · no implica SM/MCP productivo |
| Datos Pepito / company DB campañas | **forbidden** · BLOQUEADO_LEGAL |
| Campaign mass-send | **legally blocked** · `claimReadyLegal=false` |

### Agency cores (honest)

| Block | Módulo | Core | Externo |
|-------|--------|------|---------|
| 11 | `TelephonyCore` | sim **VERIFIED** | Twilio real **BLOCKED_EXTERNAL** |
| 12 | influencers_pr | **VERIFIED** | outreach send forbidden |
| 13 | `AdsAttributionCore` | core **VERIFIED** | spend/OAuth **BLOCKED_EXTERNAL** · no live OAuth |
| 14 | `CommunityPublishCore` | sim **VERIFIED** | publish **BLOCKED_EXTERNAL** · no fake OAuth |
| 16 | `OAuthMultiTenantFramework` | mock **VERIFIED** | real apps **BLOCKED_EXTERNAL** |
| 17 | `IntegrationsMarketplaceV1` | **VERIFIED** (internal ping) | external publish rejected |
| 26 | `PurchasesSuppliersCore` | **IMPLEMENTED_VERIFIED** · `withPurchasesPersistence` | payments/accounting **BLOCKED_SCOPE** · **no Odoo** |
| 27 | `InventoryWarehousesCore` | **IMPLEMENTED_VERIFIED** · `withInventoryPersistence` | no cost/GL · **no Odoo** |
| 28 | `ManufacturingOpsCore` | **IMPLEMENTED_VERIFIED** · `withManufacturingPersistence` | IoT **BLOCKED_EXTERNAL** · **no Odoo** |
| 29 | `ProjectsFieldServiceCore` | **IMPLEMENTED_VERIFIED** · `withProjectsFsPersistence` | e-signature **BLOCKED_EXTERNAL** · margin NON-GL |
| 35 | `SectorCapabilityTaxonomy` | inventory **IMPLEMENTED_VERIFIED** | industry PREPARED_OFF · health **BLOCKED_LEGAL** |

### ERP / accounting (competitive honesty)

| Integración | Estado | Notas |
|-------------|--------|-------|
| **Odoo** | ❌ **no integrado** | No connector · no sync · no claim parity · NELVYON non-financial cores only |
| Full ERP finance / GL / tax / bank | ❌ **BLOCKED_SCOPE** | Explicit out of scope ADR-060/061 |
| NELVYON ERP ops UI | ✅ staging | `/saas/erp/*` → `with*Persistence` · **ADR-061** Postgres SSOT · mig **519+520** · restart **ALL_PASS** · prod migrate gated |

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
| **AWS SES** | ✅ | `SES_*` | Production GRANTED 2026-07-21 · locale templates **PARTIAL** |
| SendGrid | 🟡 | `SENDGRID_API_KEY` | Fallback Python paths |

---

## Ads

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| **Google Ads** | 🟡 | `GOOGLE_ADS_*`, OAuth `GOOGLE_CLIENT_ID/SECRET` | Código presente · **no live OAuth spend** |
| **Meta Ads** | 🟡 | `META_*` | **no live OAuth spend** · `meta-ads-pack` beta OAuth OFF |
| **LinkedIn Ads** | 🟡 | `LINKEDIN_CLIENT_ID/SECRET` | **no live OAuth spend** |
| **TikTok Ads** | 🟡 | `TIKTOK_*` | Catálogo |
| Snapchat | 🟡 | `SNAPCHAT_*` | Catálogo |

**AdsAttributionCore (v1.6.0):** core **VERIFIED** · conectores fail-closed · `NELVYON_ADS_SPEND_ENABLED=0` · `ADS_OAUTH_SPEND_CEO_CHECKLIST.md`. **No inventar OAuth verde.**

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

| Integración | Estado | Notas |
|-------------|--------|-------|
| Twilio (SMS/voice) | 🟡 código / ❌ real | `TelephonyCore` sim **VERIFIED** · Twilio real **BLOCKED_EXTERNAL** · no dialer parity claim |
| WhatsApp (Meta) | 🟡 | Credenciales / plantillas ops — no claim live verified |
| SES transactional | ✅ / locale **PARTIAL** | Production GRANTED · templates locale incomplete |

---

## IA

| Integración | Estado | Variables | Notas |
|-------------|--------|-----------|-------|
| OpenAI | 🟡 | `OPENAI_API_KEY` + `AUTONOMOUS_ALLOW_OPENAI=1` | **OFF** staging tip (`=0`) · prod ABSENT |
| Anthropic | 🟡 | `ANTHROPIC_API_KEY` | Private AI provider |
| Ollama (local) | ✅ | `OLLAMA_HOST` | Staging Tailscale private mesh |
| Local-ai Postgres/pgvector | ✅ Docker / 🟡 Railway | Compose local | Docker **VERIFIED** · Railway **PREPARED_OFF** |
| **MCP Productivo** | ✅ | flag | CERTIFIED · **OFF** runtime |
| **MCP Staging synthetic** | ✅ | flag | ON staging · productivo 0 |
| **OpenClaw** | 🟡 | bridge flags | staging_mock · prod **PENDING_CEO** |
| **Shared Memory productivo** | 🟡 | flag | **OFF** default |
| **Shared Memory staging synthetic** | ✅ | flag | ON staging · productivo 0 |
| Private AI canary | 🟡 | — | **PREPARED_OFF** + **BLOCKED_CEO** |

---

## CRM / Productividad

| Integración | Estado | Notas |
|-------------|--------|-------|
| HubSpot | 🟡 | OAuth + sync push (486) — **no claim live OAuth verified** |
| Salesforce | 🟡 | Catálogo |
| Zapier / Make | 🟡 | Webhooks públicos |
| **n8n** | 🟡 | Blueprint JSON; sin servidor |

---

## Problemas comunes

| Problema | Integración | Acción |
|----------|-------------|--------|
| Webhook 503 | Stripe | `STRIPE_WEBHOOK_SECRET` |
| Banner amber campañas | SES | Configurar SES_* |
| OAuth redirect mismatch | Google/Meta | Alinear `*_REDIRECT_URI` — apps reales **BLOCKED_EXTERNAL** |
| WA no envía | Meta | `META_WA_*` + plantillas aprobadas |

---

## Tests de integración

Ubicación: `backend/integrations/__tests__/`, `backend/saas/__tests__/SaasIntegrationsHubService.*`
