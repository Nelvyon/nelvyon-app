# MASTER — Comparativas Open Source NELVYON

> Head-to-head: **un ganador por capacidad** · 18 comparativas clave

---

## LLM local

**Ganador: [Ollama](https://github.com/ollama/ollama)** (`ollama`)

| Criterio | Ollama |
|---|---|
| Licencia | MIT |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Core PRIVATE_MODE inference — already integrated Phase 2.

**Descartados:** `localai` (descartar), `gpt4all` (descartar), `text-generation-webui` (solo laboratorio)

---

## Vector DB

**Ganador: [pgvector](https://github.com/pgvector/pgvector)** (`pgvector`)

| Criterio | pgvector |
|---|---|
| Licencia | PostgreSQL |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Core RAG store — already in Phase 2 LocalVectorStore on Postgres 16.

**Descartados:** `qdrant` (integrar mas adelante), `weaviate` (integrar mas adelante), `milvus` (solo laboratorio)

---

## Workflow automation

**Ganador: [n8n](https://github.com/n8n-io/n8n)** (`n8n`)

| Criterio | n8n |
|---|---|
| Licencia | Sustainable Use License |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Tenant + agency workflow automation; complements SaasWorkflowService.

**Descartados:** `activepieces` (integrar mas adelante), `windmill` (solo laboratorio), `node-red` (integrar mas adelante)

---

## Orchestration durable

**Ganador: [Temporal](https://github.com/temporalio/temporal)** (`temporal`)

| Criterio | Temporal |
|---|---|
| Licencia | MIT |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Replace cron idempotency for workflows + pack runs.

**Descartados:** `prefect` (integrar mas adelante), `kestra` (integrar mas adelante)

---

## RAG framework

**Ganador: [LlamaIndex](https://github.com/run-llama/llama_index)** (`llamaindex`)

| Criterio | LlamaIndex |
|---|---|
| Licencia | MIT |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Reference patterns for OS pack RAG pipelines beyond custom TS.

**Descartados:** `haystack` (integrar mas adelante), `langchain` (integrar mas adelante)

---

## Observability APM

**Ganador: [SigNoz](https://github.com/SigNoz/signoz)** (`signoz`)

| Criterio | SigNoz |
|---|---|
| Licencia | MIT |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** All-in-one observability for PRIVATE_MODE without Grafana AGPL stack.

**Descartados:** `jaeger` (integrar mas adelante)

---

## IAM / SSO

**Ganador: [authentik](https://github.com/goauthentik/authentik)** (`authentik`)

| Criterio | authentik |
|---|---|
| Licencia | MIT |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Lighter IdP for PRIVATE_MODE and internal ops SSO.

**Descartados:** `keycloak` (integrar mas adelante), `zitadel` (integrar mas adelante)

---

## Product analytics

**Ganador: [PostHog](https://github.com/PostHog/posthog)** (`posthog`)

| Criterio | PostHog |
|---|---|
| Licencia | MIT |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** SaaS product analytics + feature flags for gradual rollouts.

**Descartados:** `plausible` (integrar mas adelante), `matomo` (integrar mas adelante), `umami` (integrar mas adelante)

---

## Email marketing

**Ganador: [Listmonk](https://github.com/knadh/listmonk)** (`listmonk`)

| Criterio | Listmonk |
|---|---|
| Licencia | AGPL-3.0 |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Tenant newsletter engine; AGPL review if exposing UI to tenants.

**Descartados:** `mautic` (integrar mas adelante), `keila` (integrar mas adelante)

---

## CRM open source

**Ganador: [Twenty](https://github.com/twentyhq/twenty)** (`twenty`)

| Criterio | Twenty |
|---|---|
| Licencia | AGPL-3.0 |
| Madurez | stable |
| Calidad | high |
| Integración NELVYON | medium |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Reference UX for SaasCrmService evolution; AGPL limits embedded multi-tenant.

**Descartados:** `espocrm` (solo laboratorio), `suitecrm` (descartar)

---

## Helpdesk

**Ganador: [Chatwoot](https://github.com/chatwoot/chatwoot)** (`chatwoot`)

| Criterio | Chatwoot |
|---|---|
| Licencia | MIT |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Tenant support widget + agency inbox; complements SaasInbox.

**Descartados:** `zammad` (solo laboratorio), `freescout` (integrar mas adelante)

---

## CMS headless

**Ganador: [Payload CMS](https://github.com/payloadcms/payload)** (`payload-cms`)

| Criterio | Payload CMS |
|---|---|
| Licencia | MIT |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Best-fit CMS for Next.js 15 stack — OS pack content backend.

**Descartados:** `strapi` (integrar mas adelante), `directus` (integrar mas adelante)

---

## E-commerce

**Ganador: [Medusa](https://github.com/medusajs/medusa)** (`medusa`)

| Criterio | Medusa |
|---|---|
| Licencia | MIT |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Headless ecommerce for client stores in ecommerce-growth pack.

**Descartados:** `saleor` (integrar mas adelante), `woocommerce` (integrar mas adelante)

---

## Browser automation

**Ganador: [Playwright](https://github.com/microsoft/playwright)** (`playwright`)

| Criterio | Playwright |
|---|---|
| Licencia | Apache-2.0 |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Primary E2E for /saas/*, portal, and OS pack smoke tests.

**Descartados:** `puppeteer` (integrar mas adelante), `selenium` (integrar mas adelante)

---

## OCR

**Ganador: [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)** (`paddleocr`)

| Criterio | PaddleOCR |
|---|---|
| Licencia | Apache-2.0 |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Superior accuracy for marketing PDFs and invoices in ingest pipeline.

**Descartados:** `tesseract` (integrar mas adelante)

---

## PDF generation

**Ganador: [Gotenberg](https://github.com/gotenberg/gotenberg)** (`gotenberg`)

| Criterio | Gotenberg |
|---|---|
| Licencia | MIT |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** Pack deliverable PDF generation for OS landing and reports.

**Descartados:** `stirling-pdf` (integrar mas adelante)

---

## WhatsApp bridge

**Ganador: [Evolution API](https://github.com/EvolutionAPI/evolution-api)** (`evolution-api`)

| Criterio | Evolution API |
|---|---|
| Licencia | Apache-2.0 |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** WhatsApp channel for SaasInbox and campaign notifications.

**Descartados:** —

---

## BI dashboards

**Ganador: [Metabase](https://github.com/metabase/metabase)** (`metabase`)

| Criterio | Metabase |
|---|---|
| Licencia | AGPL-3.0 |
| Madurez | production |
| Calidad | high |
| Integración NELVYON | high |
| PRIVATE_MODE | ✅ |
| Docker | ✅ |
| Windows | ✅ |

**Por qué gana:** CEO metrics and tenant CRM analytics dashboards from Postgres.

**Descartados:** `redash` (integrar mas adelante)


---

## Matriz rápida SaaS vs OSS

| Capa NELVYON actual | SaaS/propietario | OSS recomendado | Fase |
|---|---|---|---|
| Email | AWS SES | Postal + Listmonk | Fase 3 |
| Analytics | PostHog cloud | PostHog self-host / Plausible | Fase 2 |
| Errors | Sentry cloud | Sentry self-host / GlitchTip | Fase 2 |
| Workflows | Cron + custom | Temporal + n8n | Fase 2 |
| LLM | OpenAI (packs) | Ollama (✅ Phase 2) | En curso |
| Vector | pgvector (✅) | pgvector | Integrado |
| CRM externo | HubSpot sync | Twenty (opcional) | Fase 4 |
| Payments | Stripe | Stripe (mantener) | — |
