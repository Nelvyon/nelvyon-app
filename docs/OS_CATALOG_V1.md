# NELVYON OS Catalog v1

> **Version** `1.2.0` · ADR-055 · tip **TBA** · `claimReady: false`  
> Código SSOT: `backend/agency/OsCatalogV1.ts` (`OS_CATALOG_V1_VERSION`)  
> Vocabulario: `IMPLEMENTED_VERIFIED` | `PREPARED_OFF` | `BLOCKED_EXTERNAL` | `BLOCKED_CEO` | `BLOCKED_LEGAL` | `NOT_IMPLEMENTED`

Sustituye el estado ambiguo “todos los servicios futuros”. **Solo** servicios definidos.  
`IMPLEMENTED_VERIFIED` exige: equipo, roles, permisos, flujo, QA, entregables, tests **y** evidencia E2E. Sin eso → PREPARED_OFF / BLOCKED / NOT_IMPLEMENTED.

## Resumen

| Estado | Count (código) |
|--------|------:|
| IMPLEMENTED_VERIFIED | ver `osCatalogV1Summary()` |
| PREPARED_OFF | automations · reputation · nelvyon_official_social · SM/MCP synthetic |
| BLOCKED_EXTERNAL | ads |
| NOT_IMPLEMENTED | influencers_pr |
| claimReady / READY | **BLOCKED_LEGAL** |

## Servicios

| serviceId | Equipo | Status | Evidencia / next |
|-----------|--------|--------|------------------|
| web_landing | svc_web_ux_cro | IMPLEMENTED_VERIFIED | growth pack E2E |
| seo | svc_seo_content | IMPLEMENTED_VERIFIED | growth pack E2E |
| content_social | svc_social_creative | IMPLEMENTED_VERIFIED | ADR-052 + auditor ON |
| strategy / funnel / retention | specialist teams | IMPLEMENTED_VERIFIED | new-os-packs E2E |
| ecommerce / crm_sales | specialist teams | IMPLEMENTED_VERIFIED | pack E2E |
| reporting | svc_analytics_reporting | IMPLEMENTED_VERIFIED | beta packs E2E |
| email | svc_email_lifecycle | IMPLEMENTED_VERIFIED | welcome · send masivo BLOCKED |
| support | chatbot SKU | IMPLEMENTED_VERIFIED | growth E2E |
| independent_auditor | global_independent_auditor | IMPLEMENTED_VERIFIED | session E2E staging |
| openclaw_coordination | global_direction | IMPLEMENTED_VERIFIED | staging_mock · prod BLOCKED_CEO |
| visual_elite_strategy | creative | IMPLEMENTED_VERIFIED (strategy_only) | creative_direction · spend OFF |
| nelvyon_official_social | svc_social_creative | PREPARED_OFF | `NelvyonOfficialSocialOps` · PENDING_CEO cuentas |
| automations | svc_automations_crm | PREPARED_OFF | `automations-ops-pack` beta · E2E pending |
| reputation | svc_retention_reputation | PREPARED_OFF | `reputation-ops-pack` beta · E2E pending |
| sm_mcp_synthetic_staging | platform | PREPARED_OFF | harness código · flags not set · productivo 0 |
| ads | svc_ads_attribution | BLOCKED_EXTERNAL | OAuth + presupuesto |
| influencers_pr | — | NOT_IMPLEMENTED | Definir contrato |

## Gates

- Prod: OpenClaw / auditor / SM / MCP / OpenAI / payouts / paid / visual spend **OFF**
- Staging live (ADR-054): auditor=1 · OpenClaw staging_mock=1 · SM productiva=0 · visual=0
- Staging post ADR-055 deploy: + `NELVYON_SHARED_MEMORY_STAGING=1` · `NELVYON_MCP_STAGING_SYNTHETIC=1` (synthetic only)
