# NELVYON OS Catalog v1

> **Version** `1.2.0` · ADR-055 E2E PASS · tip **`53149384`** · deploy **`e514bbd7`** · `claimReady: false`  
> Código SSOT: `backend/agency/OsCatalogV1.ts` (`OS_CATALOG_V1_VERSION`)  
> Vocabulario: `IMPLEMENTED_VERIFIED` | `PREPARED_OFF` | `BLOCKED_EXTERNAL` | `BLOCKED_CEO` | `BLOCKED_LEGAL` | `NOT_IMPLEMENTED`

Sustituye el estado ambiguo “todos los servicios futuros”. **Solo** servicios definidos.  
`IMPLEMENTED_VERIFIED` exige: equipo, roles, permisos, flujo, QA, entregables, tests **y** evidencia E2E. Sin eso → PREPARED_OFF / BLOCKED / NOT_IMPLEMENTED.

## Resumen

| Estado | Count (código) |
|--------|------:|
| IMPLEMENTED_VERIFIED | ver `osCatalogV1Summary()` |
| PREPARED_OFF | nelvyon_official_social |
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
| automations | svc_automations_crm | IMPLEMENTED_VERIFIED (staging) | `automations-ops-pack` E2E ALL_PASS · 6 entregables |
| reputation | svc_retention_reputation | IMPLEMENTED_VERIFIED (staging) | `reputation-ops-pack` E2E ALL_PASS · 6 entregables |
| sm_mcp_synthetic_staging | platform | IMPLEMENTED_VERIFIED (staging) | flags ON · productivo 0 · harness unit tests PASS |
| nelvyon_official_social | svc_social_creative | PREPARED_OFF | `NelvyonOfficialSocialOps` · 8 cuentas PENDING_CEO |
| ads | svc_ads_attribution | BLOCKED_EXTERNAL | OAuth + presupuesto |
| influencers_pr | — | NOT_IMPLEMENTED | Definir contrato |

## Gates

- Prod: OpenClaw / auditor / SM / MCP / OpenAI / payouts / paid / visual spend **OFF**
- Staging live (ADR-055): auditor=1 · OpenClaw staging_mock=1 · `NELVYON_SHARED_MEMORY_STAGING=1` · `NELVYON_MCP_STAGING_SYNTHETIC=1` · SM/MCP productivo=0 · visual=0
- Evidencia: `automations_reputation_e2e_latest.md`
