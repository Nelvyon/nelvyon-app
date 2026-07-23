# OS Universal Service Catalog — NELVYON

> **SSOT** del estado real de servicios OS de marketing / ventas / automatización.  
> Actualizado: **2026-07-24** · tip `60bdd1bd` · Staging Pack E2E ALL_PASS · `claimReady: false`  
> Vocabulario de estado (único permitido): `IMPLEMENTED_VERIFIED` | `BETA` | `PREPARED_OFF` | `BLOCKED_EXTERNAL` | `NOT_IMPLEMENTED`  
> **Prohibido** marcar AVAILABLE / elite solo por existir ruta, agente o pantalla.

Relacionado: `backend/agency/OsCapabilityRegistry.ts` · `apps/web/src/lib/packs/packRegistry.ts` · `docs/agency-playbooks/` · ADR-047

---

## Reglas de honestidad

| Regla | Detalle |
|-------|---------|
| QA | Umbral **≥85** innegociable · auto-approve solo si pack `completed` |
| Flujo objetivo | brief → análisis → agentes → ejecución → QA≥85 → entregables → portal → métricas |
| Promote beta→available | Criterios en `SERVICE_BETA_PACKS.md` (mapper dedicado, E2E PASS, portal, tenant iso, rollback) |
| SKUs autónomos | Solo `NELVYON-LANDING` · `NELVYON-SEO` · `NELVYON-CHATBOT` |
| Prod IA | **OFF** · mesh/OpenAI/MCP/SM/payouts **ABSENT** |
| Sector playbooks | Solo si hay servicio + evidencia real |

---

## Resumen ejecutivo

| Estado | Count | Ejemplos |
|--------|------:|----------|
| IMPLEMENTED_VERIFIED | 5 | local growth · landing · SEO · chatbot · email welcome (pack) |
| BETA | 5 | social-calendar · content-strategy · cro-audit · analytics-setup · brand-voice |
| PREPARED_OFF | 7 | ecommerce-growth · saas-b2b-growth · automations SaaS · reputation SaaS · funnels SaaS · premium fleet · prod IA |
| BLOCKED_EXTERNAL | 2 | ads spend/OAuth · legal campañas (claimReady) |
| NOT_IMPLEMENTED | 3 | strategy OS · retention/loyalty OS · standalone funnel OS pack |

---

## Matriz canónica — 11 capabilities (`OsCapabilityRegistry`)

| servicio | sector aplicable | playbook | agentes (primary) | herramientas | entrada | entregables | QA | pruebas | portal | estado real | bloqueo |
|----------|------------------|----------|-------------------|--------------|---------|-------------|----|---------|--------|-------------|---------|
| **web_landing** | local · ecom · saas | `SERVICE_WEB_LANDING.md` | `NELVYON-LANDING` · landing_premium | Ollama mesh · pack orchestrator | brief intake growth | Landing live URL | ≥85 | Pack E2E local ALL_PASS · packAutoApprove | `/portal` | **IMPLEMENTED_VERIFIED** | — |
| **seo** | local · ecom · saas | `SERVICE_SEO.md` | `NELVYON-SEO` · seo · seo_premium | Ollama · seoGenerator aislado | brief + seed_keywords | Auditoría SEO JSON | ≥85 | Pack E2E local (SKU done) · meshQaFixes | `/portal` | **IMPLEMENTED_VERIFIED** | — (SKU vía pack local) |
| **support** (chatbot) | local (+ growth) | `SERVICE_SUPPORT.md` | `NELVYON-CHATBOT` · support · portal_client | Ollama · KB normalize | brief bot + website | Chatbot live + KB | ≥85 | Pack E2E local · chatbot normalize tests | `/portal` | **IMPLEMENTED_VERIFIED** | — |
| **email** (welcome pack) | local | `SERVICE_EMAIL.md` | email_marketing · welcome sequence | SES / queue | contact_email | Campaña bienvenida 3-touch | ≥85 metadata | Pack E2E título esperado | `/portal` | **IMPLEMENTED_VERIFIED** | SES prod ops (env) |
| **ecommerce** | ecommerce | `SERVICE_ECOMMERCE.md` | LANDING+SEO · ecommerce mapper | kickoff `ecommerce-growth` | intake ecom | Landing/SEO/chatbot ecom | ≥85 | Smoke harness existe · **sin ALL_PASS reciente SSOT** | `/portal` | **PREPARED_OFF** | IA staging/prod OFF en muchos runs · falta E2E verde reciente |
| **crm_sales** | saas-b2b | `SERVICE_CRM_SALES.md` | crm · sales | SaaS CRM real · saas-b2b pack | intake B2B | Pipeline / outbound steps | ≥85 (pack) | Tenant iso 16/16 · pack harness | `/portal` | **PREPARED_OFF** | Pack OS no mesh-ALL_PASS reciente |
| **ads** | ecom · local | `SERVICE_ADS.md` | google_ads · meta_ads · tiktok_ads | Meta kit step · SaaS publicidad | campaign brief | Kits creativos / campañas | ≥85 | Parity OAuth 🟡 | `/portal` | **BLOCKED_EXTERNAL** | OAuth · spend · CEO approval |
| **automations** | transversal | `SERVICE_AUTOMATIONS.md` | workflows · operations | SaaS WorkflowService | workflow CRUD | runs / unified reporting | n/a OS pack | BFF smokes hist | SaaS UI | **PREPARED_OFF** | Sin kickoff OS pack · no pack E2E |
| **content_social** | transversal | `SERVICE_CONTENT_SOCIAL.md` | content · social_media | beta packs (3) | pack intake | Genéricos | ≥85 target | Beta harness · **no promote** | `/portal` | **BETA** | Mapper genérico · sin cert PASS |
| **reputation** | local · ecom | `SERVICE_REPUTATION.md` | support · ORM premium | SaaS `/saas/reputacion` | sync reviews | ratings UI | — | Parity SaaS | SaaS | **PREPARED_OFF** | Sin pack OS / E2E servicio |
| **reporting** | transversal | `SERVICE_REPORTING.md` | reporting | `analytics-setup-pack` beta | setup brief | Informe analytics genérico | ≥85 target | Beta only | `/portal` | **BETA** | Promote blockers |

---

## Packs OS (runtime)

| PackId | Catálogo UI | SKUs | Mapper | E2E evidencia | estado real |
|--------|-------------|------|--------|---------------|-------------|
| `local-business-growth` | available | L→S→C | `localPackProduction` dedicado | Staging **ALL_PASS completed** 2026-07-24 | **IMPLEMENTED_VERIFIED** |
| `ecommerce-growth` | available | L→S→C | `ecommercePackProduction` | Harness · sin ALL_PASS SSOT reciente | **PREPARED_OFF** |
| `saas-b2b-growth` | available | L→S→C | `saasB2bPackProduction` | Harness · sin ALL_PASS SSOT reciente | **PREPARED_OFF** |
| `social-calendar-pack` | beta | L→C | genérico | — | **BETA** |
| `content-strategy-pack` | beta | L→S | genérico | — | **BETA** |
| `cro-audit-pack` | beta | L→S | genérico | — | **BETA** |
| `analytics-setup-pack` | beta | S→L | genérico | — | **BETA** |
| `brand-voice-pack` | beta | L→C | genérico | — | **BETA** |

Satélites catálogo (`seo-local-pack`, `meta-ads-pack`, `email-welcome-nurture`, `landing-funnel-pack`) **reutilizan** growth kickoffs — no inventar estado “available” como servicio independiente.

---

## Catálogo objetivo (cobertura universal)

Flujo obligatorio por servicio: **brief → análisis → agentes → ejecución → QA≥85 → entregables → portal → métricas**.

| Dominio | Servicio objetivo | Estado hoy | Prioridad siguiente |
|---------|-------------------|------------|---------------------|
| Estrategia | Brief CEO / plan 90d OS | **NOT_IMPLEMENTED** | P2 — contrato + agente PM sin mint decorativo |
| Web / CRO | Landing + CRO audit | Landing **VERIFIED** · CRO **BETA** | Certificar cro-audit (mapper+E2E) |
| Funnels | Funnel multi-step OS | SaaS funnels **PREPARED_OFF** · OS pack **NOT_IMPLEMENTED** | Tras CRO cert |
| SEO | Auditoría + on-page | **IMPLEMENTED_VERIFIED** (local) | E2E ecommerce/saas SEO |
| Publicidad | Meta/Google/TikTok | **BLOCKED_EXTERNAL** | Tras OAuth CEO |
| Contenido | Strategy + brand | **BETA** | Promote solo con evidencia |
| Redes | Social calendar | **BETA** | Idem |
| Email / CRM | Welcome + campaigns + CRM | Welcome **VERIFIED** · CRM SaaS **PREPARED_OFF** | SaaS-b2b pack E2E verde |
| Ventas | Pipeline OS deliverable | **PREPARED_OFF** | Ligado saas-b2b |
| Automatizaciones | Workflows OS pack | **PREPARED_OFF** (SaaS engine) | Pack opcional reutilizando WorkflowService |
| Ecommerce | Growth pack | **PREPARED_OFF** | **P1** — Pack E2E mesh staging |
| Reputación | ORM pack | **PREPARED_OFF** | Mapper + kickoff |
| Analítica | Analytics setup | **BETA** | Cert promote |
| Soporte | Chatbot citas | **IMPLEMENTED_VERIFIED** | Expand tickets SaaS |
| Retención | Loyalty / memberships OS | **NOT_IMPLEMENTED** | Tras CRM/email maduros |

---

## Construcción por fases (sin humo)

### Fase A — Certificar prepared (impacto alto · reutiliza SKUs)

1. **ecommerce-growth** Pack E2E staging mesh → ALL_PASS (mismo patrón local).  
2. **saas-b2b-growth** Pack E2E staging mesh → ALL_PASS.  
3. Documentar evidencia en HANDOVER / este catálogo → subir a `IMPLEMENTED_VERIFIED`.

### Fase B — Beta → evidencia (no promote prematuro)

Por cada beta: mapper dedicado · playbook pack · unit + E2E · portal · tenant iso · rollback · QA≥85 real.

Orden sugerido: `cro-audit-pack` → `analytics-setup-pack` → `content-strategy-pack` → `brand-voice-pack` → `social-calendar-pack`.

### Fase C — Nuevos servicios (solo con contrato)

| Capacidad | Contrato mínimo |
|-----------|-----------------|
| strategy | brief schema · agente PM · entregable plan PDF/JSON · QA · portal |
| reputation-pack | kickoff · sync reviews · entregable informe · E2E |
| retention | loyalty OS deliverable · CRM link · métricas churn |

**No** instalar herramientas externas sin ADR + aprobación CTO (`FREE_TOOLS_EVALUATION.md`).

---

## Evidencia de referencia

| Gate | Resultado | Ref |
|------|-----------|-----|
| Pack E2E local | ALL_PASS completed · 5 auto-approve | `.release-logs/pack-e2e-99b30730-*.txt` · tip `99b30730` |
| Portal packs | ALL_PASS | staging smoke |
| MESH | MESH_JOIN_OK | Railway logs |
| Tenant iso | 16/16 | vitest CRM+Deals |
| Prod IA | ABSENT | Railway names-only |

---

## Rollback

Staging IA: `NELVYON_AI_ENABLED=0` + `OLLAMA_CONFIGURED=0`.  
Packs: no bajar QA; `needs_review` si score &lt;85.
