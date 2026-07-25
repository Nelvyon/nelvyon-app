# NELVYON OS Catalog v1

> **Version** `1.6.0` · ADR-058 + ads/community core promote · `claimReady: false` · **NOT READY**  
> Código SSOT: `backend/agency/OsCatalogV1.ts` (`OS_CATALOG_V1_VERSION`)  
> Vocabulario: `IMPLEMENTED_VERIFIED` | `PREPARED_OFF` | `BLOCKED_EXTERNAL` | `BLOCKED_CEO` | `BLOCKED_LEGAL` | `NOT_IMPLEMENTED`

Sustituye el estado ambiguo “todos los servicios futuros”. **Solo** servicios definidos.  
`IMPLEMENTED_VERIFIED` exige: equipo, roles, permisos, flujo, QA, entregables, tests **y** evidencia. Sin eso → PREPARED_OFF / BLOCKED / NOT_IMPLEMENTED.

## Resumen

| Estado | Servicios (v1.6.0) |
|--------|-------------------|
| IMPLEMENTED_VERIFIED | growth packs · automations · reputation · SM-MCP synthetic · influencers_pr · telephony_core · ads_attribution_core · community_publish_core · oauth_multitenant · integrations_marketplace · private_vector_rag · + cores Blocks 15/19–23 (ver matriz) |
| PREPARED_OFF | private_ai_canary_prep · nelvyon_official_social · mobile (contract verified) |
| BLOCKED_EXTERNAL | real telephony · real ads spend/OAuth · real publish · App Store/Play · multi-region |
| BLOCKED_LEGAL | mass-send · claimReady |
| BLOCKED_CEO | private_ai_canary_prep prod activation |

## Servicios (baseline + ADR-057/058)

| serviceId | Equipo | Status | Evidencia / next |
|-----------|--------|--------|------------------|
| web_landing / seo / content_social / strategy / funnel / retention / ecommerce / crm_sales / reporting / email / support | specialist teams | IMPLEMENTED_VERIFIED | pack E2E |
| independent_auditor | global_independent_auditor | IMPLEMENTED_VERIFIED | ADR-055 staging |
| openclaw_coordination | global_direction | IMPLEMENTED_VERIFIED (staging_mock) | prod BLOCKED_CEO |
| visual_elite_strategy | creative | IMPLEMENTED_VERIFIED (strategy_only) | spend OFF |
| automations | svc_automations_crm | IMPLEMENTED_VERIFIED (staging) | E2E ALL_PASS |
| reputation | svc_retention_reputation | IMPLEMENTED_VERIFIED (staging) | E2E ALL_PASS |
| sm_mcp_synthetic_staging | platform | IMPLEMENTED_VERIFIED (staging) | harness PASS |
| nelvyon_official_social | svc_social_creative | PREPARED_OFF | 8 cuentas PENDING_CEO |
| **telephony_core** (Block 11) | svc_automations_crm | IMPLEMENTED_VERIFIED (simulator) | real calls BLOCKED_EXTERNAL |
| **influencers_pr** (Block 12) | svc_social_creative | IMPLEMENTED_VERIFIED (staging) | outreach=false |
| **ads_attribution_core** (Block 13) | svc_ads_attribution | IMPLEMENTED_VERIFIED (core) | spend/OAuth BLOCKED_EXTERNAL |
| **community_publish_core** (Block 14) | svc_social_creative | IMPLEMENTED_VERIFIED (simulator) | real publish BLOCKED_EXTERNAL |
| mass-send controls (Block 15) | svc_email_lifecycle | IMPLEMENTED_VERIFIED (controls) | send BLOCKED_LEGAL |
| **oauth_multitenant** (Block 16) | global_security_compliance | IMPLEMENTED_VERIFIED (framework+mock) | real apps BLOCKED_EXTERNAL |
| **integrations_marketplace** (Block 17) | svc_automations_crm | IMPLEMENTED_VERIFIED (internal ping) | external publish rejected |
| mobile Capacitor (Block 18) | platform | PREPARED_OFF / contract VERIFIED | App Store/Play BLOCKED_EXTERNAL |
| PWA (Block 19) | platform | IMPLEMENTED_VERIFIED (Chrome/Windows) | iOS Safari PARTIAL |
| localization (Block 20) | platform | IMPLEMENTED_VERIFIED (es/en) | fr/de/it/pt PARTIAL |
| HA/DR (Block 21) | platform | IMPLEMENTED_VERIFIED (runbook) | multi-region BLOCKED_EXTERNAL |
| observability (Block 22) | platform | IMPLEMENTED_VERIFIED (local core) | paid vendors PREPARED_OFF |
| legacy consolidation (Block 23) | platform | IMPLEMENTED_VERIFIED (audit) | zero unsafe deletes |
| **private_vector_rag** (Block 24) | global_security_compliance | IMPLEMENTED_VERIFIED (synthetic) | Railway pgvector PREPARED_OFF |
| **private_ai_canary_prep** (Block 25) | global_security_compliance | PREPARED_OFF | BLOCKED_CEO |

## Gates

- Prod: OpenClaw / auditor / SM / MCP / OpenAI / payouts / paid / visual / real telephony / ads spend / publish **OFF**
