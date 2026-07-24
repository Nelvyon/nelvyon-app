# NELVYON OS Catalog v1

> **Version** `1.1.0` · ADR-053/054 · tip ver HANDOVER · `claimReady: false`  
> Código SSOT: `backend/agency/OsCatalogV1.ts` (roles · flow · certificationCriteria por servicio)  
> Vocabulario: `IMPLEMENTED_VERIFIED` | `PREPARED_OFF` | `BLOCKED_EXTERNAL` | `BLOCKED_CEO` | `BLOCKED_LEGAL` | `NOT_IMPLEMENTED`

Sustituye el estado ambiguo “todos los servicios futuros”. **Solo** servicios definidos.  
`IMPLEMENTED_VERIFIED` exige: equipo, roles, permisos, flujo, QA, entregables, tests **y** evidencia E2E. Sin eso → PREPARED_OFF / BLOCKED / NOT_IMPLEMENTED.

## Resumen

| Estado | Count (código) |
|--------|------:|
| IMPLEMENTED_VERIFIED | ver `osCatalogV1Summary()` |
| PREPARED_OFF | automations · reputation |
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
| visual_elite_strategy | creative | IMPLEMENTED_VERIFIED (strategy_only) | pipeline OFF spend |
| nelvyon_official_social | svc_social_creative | PREPARED_OFF | PENDING_CEO cuentas |
| ads | svc_ads_attribution | BLOCKED_EXTERNAL | OAuth + presupuesto |
| automations / reputation | — | PREPARED_OFF | Pack OS + E2E |
| influencers_pr | — | NOT_IMPLEMENTED | Definir contrato |

## Gates

- Prod: OpenClaw / auditor / SM / MCP / OpenAI / payouts / paid / visual spend **OFF**
- Staging: auditor=1 · OpenClaw staging_mock=1 · SM productiva=0 · visual=0
