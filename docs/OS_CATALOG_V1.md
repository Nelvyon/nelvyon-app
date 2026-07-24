# NELVYON OS Catalog v1

> **Version** `1.0.0` · ADR-053 · tip ver HANDOVER · `claimReady: false`  
> Código SSOT: `backend/agency/OsCatalogV1.ts`  
> Vocabulario: `IMPLEMENTED_VERIFIED` | `PREPARED_OFF` | `BLOCKED_EXTERNAL` | `BLOCKED_CEO` | `BLOCKED_LEGAL` | `NOT_IMPLEMENTED`

Este catálogo **sustituye** el estado ambiguo “todos los servicios futuros”. Solo servicios definidos por NELVYON.

## Resumen

| Estado | Count |
|--------|------:|
| IMPLEMENTED_VERIFIED | ver `osCatalogV1Summary()` |
| PREPARED_OFF | automations · reputation |
| BLOCKED_EXTERNAL | ads |
| NOT_IMPLEMENTED | influencers_pr |
| claimReady / READY | **BLOCKED_LEGAL** (fuera del catálogo de servicio) |

## Servicios

| serviceId | Equipo | Status | Evidencia / next |
|-----------|--------|--------|------------------|
| web_landing | svc_web_ux_cro | IMPLEMENTED_VERIFIED | growth pack E2E |
| seo | svc_seo_content | IMPLEMENTED_VERIFIED | growth pack E2E |
| content_social | svc_social_creative | IMPLEMENTED_VERIFIED | ADR-052 social E2E |
| strategy | svc_strategy_brand | IMPLEMENTED_VERIFIED | new-os-packs E2E |
| funnel | svc_web_ux_cro | IMPLEMENTED_VERIFIED | new-os-packs E2E |
| retention | svc_retention_reputation | IMPLEMENTED_VERIFIED | new-os-packs E2E |
| ecommerce | svc_ecommerce_growth | IMPLEMENTED_VERIFIED | ecommerce E2E |
| crm_sales | svc_saas_b2b_growth | IMPLEMENTED_VERIFIED | saas-b2b E2E |
| reporting | svc_analytics_reporting | IMPLEMENTED_VERIFIED | beta packs E2E |
| email | svc_email_lifecycle | IMPLEMENTED_VERIFIED | welcome path · send masivo BLOCKED |
| support | svc_retention_reputation | IMPLEMENTED_VERIFIED | chatbot SKU E2E |
| independent_auditor | global_independent_auditor | IMPLEMENTED_VERIFIED | ADR-053 session E2E |
| openclaw_coordination | global_direction | IMPLEMENTED_VERIFIED | staging_mock ADR-053 · prod BLOCKED_CEO |
| ads | svc_ads_attribution | BLOCKED_EXTERNAL | OAuth + presupuesto |
| automations | svc_automations_crm | PREPARED_OFF | Pack OS + E2E |
| reputation | svc_retention_reputation | PREPARED_OFF | Pack OS + E2E |
| influencers_pr | — | NOT_IMPLEMENTED | Definir contrato |

Cada entrada en código incluye: permisos, forbidden, deliverables, rúbrica QA (≥85/90), auditor independiente, portal, métricas, tests y E2E.

## Gates permanentes

- Prod: OpenClaw / auditor / SM / MCP / OpenAI / payouts / paid social / auto-publish **OFF** sin nueva autorización CEO.
- Staging: `NELVYON_PACK_INDEPENDENT_AUDITOR=1` · `NELVYON_OPENCLAW_BRIDGE_ENABLED=1` · `NELVYON_OPENCLAW_STAGING_MODE=1` · SM productiva **0**.
