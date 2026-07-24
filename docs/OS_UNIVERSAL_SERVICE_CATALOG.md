# OS Universal Service Catalog — NELVYON

> **SSOT** del estado real de servicios OS de marketing / ventas / automatización.  
> Actualizado: **2026-07-24** · tip post-cert (ver `git rev-parse HEAD`) · Staging Pack E2E ecommerce+saas-b2b **ALL_PASS** · `claimReady: false`  
> Vocabulario de estado (único permitido): `IMPLEMENTED_VERIFIED` | `BETA` | `PREPARED_OFF` | `BLOCKED_EXTERNAL` | `NOT_IMPLEMENTED`  
> **Prohibido** marcar AVAILABLE / elite solo por existir ruta, agente o pantalla.

Relacionado: `backend/agency/OsCapabilityRegistry.ts` · `apps/web/src/lib/packs/packRegistry.ts` · `docs/agency-playbooks/` · ADR-047 · ADR-049

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
| Tools nuevas | **0 installs** · Matomo/Umami solo si CTO aprueba ADR-048 |

---

## Resumen ejecutivo

| Estado | Count | Ejemplos |
|--------|------:|----------|
| IMPLEMENTED_VERIFIED | 7 | local · ecommerce · saas-b2b · landing · SEO · chatbot · email welcome |
| BETA | 8 | social · content · cro · analytics · brand · **strategy** · **funnel** · **retention** |
| PREPARED_OFF | 4 | automations SaaS · reputation SaaS · funnels SaaS UI · prod IA |
| BLOCKED_EXTERNAL | 2 | ads OAuth/spend · legal campañas (claimReady) |
| NOT_IMPLEMENTED | 0 | (Strategy/Funnel/Retention tienen código + kickoff; E2E mesh pendiente → **BETA**) |

---

## Matriz canónica — 14 capabilities (`OsCapabilityRegistry`)

| servicio | playbook | agentes | estado real | evidencia / bloqueo |
|----------|----------|---------|-------------|---------------------|
| **web_landing** | `SERVICE_WEB_LANDING.md` | `NELVYON-LANDING` | **IMPLEMENTED_VERIFIED** | Pack E2E local/ecom/saas |
| **seo** | `SERVICE_SEO.md` | `NELVYON-SEO` | **IMPLEMENTED_VERIFIED** | Idem |
| **support** | `SERVICE_SUPPORT.md` | `NELVYON-CHATBOT` | **IMPLEMENTED_VERIFIED** | Idem |
| **email** | `SERVICE_EMAIL.md` | email_marketing | **IMPLEMENTED_VERIFIED** | Welcome pack local |
| **ecommerce** | `SERVICE_ECOMMERCE.md` | L+S+C | **IMPLEMENTED_VERIFIED** | `.release-logs/ecommerce-pack-e2e-20260724-015452.txt` ALL_PASS |
| **crm_sales** | `SERVICE_CRM_SALES.md` | crm · sales | **IMPLEMENTED_VERIFIED** | `.release-logs/saas-b2b-pack-e2e-20260724-022752.txt` ALL_PASS |
| **ads** | `SERVICE_ADS.md` | ads agents | **BLOCKED_EXTERNAL** | OAuth/spend/CEO |
| **automations** | `SERVICE_AUTOMATIONS.md` | workflows | **PREPARED_OFF** | SaaS engine · sin pack OS E2E |
| **content_social** | `SERVICE_CONTENT_SOCIAL.md` | content/social | **BETA** | Mapper genérico · no promote |
| **reputation** | `SERVICE_REPUTATION.md` | support | **PREPARED_OFF** | Sin pack OS |
| **reporting** | `SERVICE_REPORTING.md` | reporting | **BETA** | analytics-setup beta |
| **strategy** | `SERVICE_STRATEGY.md` | LANDING + plan | **BETA** | Código+flag · E2E mesh pendiente |
| **funnel** | `SERVICE_FUNNEL.md` | L+S + mapa | **BETA** | Código+flag · E2E mesh pendiente |
| **retention** | `SERVICE_RETENTION.md` | chatbot + secuencias | **BETA** | Código+flag · E2E mesh pendiente |

---

## Packs OS (runtime)

| PackId | Catalog UI | Mapper | E2E evidencia | estado real |
|--------|------------|--------|---------------|-------------|
| `local-business-growth` | available | `localPackProduction` | Staging ALL_PASS | **IMPLEMENTED_VERIFIED** |
| `ecommerce-growth` | available | `ecommercePackProduction` | `ecommerce-pack-e2e-20260724-015452` ALL_PASS | **IMPLEMENTED_VERIFIED** |
| `saas-b2b-growth` | available | `saasB2bPackProduction` | `saas-b2b-pack-e2e-20260724-022752` ALL_PASS | **IMPLEMENTED_VERIFIED** |
| `social-calendar-pack` | beta | genérico | — | **BETA** |
| `content-strategy-pack` | beta | genérico | — | **BETA** |
| `cro-audit-pack` | beta | genérico | — | **BETA** |
| `analytics-setup-pack` | beta | genérico | — | **BETA** |
| `brand-voice-pack` | beta | genérico | — | **BETA** |
| `strategy-pack` | beta | `strategyPackProduction` | harness `staging-smoke-new-os-packs-e2e.mjs` | **BETA** (flag OFF prod) |
| `funnel-growth-pack` | beta | `funnelPackProduction` | idem | **BETA** |
| `retention-pack` | beta | `retentionPackProduction` | idem | **BETA** |

### Auditoría beta (2026-07-24) — **ningún promote**

Criterio promote (`SERVICE_BETA_PACKS.md`): mapper dedicado · E2E mesh ALL_PASS · portal · tenant iso · rollback · QA≥85.  
Los 5 betas originales usan mapper **genérico** y **no** tienen ALL_PASS mesh reciente → permanecen **BETA**.  
Strategy/Funnel/Retention: mappers dedicados + flags `NELVYON_*_PACK` · **no** IMPLEMENTED_VERIFIED hasta E2E ALL_PASS post-deploy.

---

## Rollback / flags

| Entorno | Acción |
|---------|--------|
| Staging IA off | `NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0` |
| New packs off | `NELVYON_STRATEGY_PACK=0` · `NELVYON_FUNNEL_PACK=0` · `NELVYON_RETENTION_PACK=0` |
| Prod | IA/mesh/OpenAI/MCP/SM/payouts/campañas **OFF/ABSENT** · flags new packs default OFF |

---

## claimReady

**false** — legal campañas bloquea READY. No declarar READY sin evidencia legal + matriz.
