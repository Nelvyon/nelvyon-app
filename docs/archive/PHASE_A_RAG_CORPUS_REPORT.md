# Fase A — Informe corpus RAG NELVYON

> 2026-07-12T10:57:53.463Z

## Resumen

| Métrica | Valor |
|---|---|
| Entradas manifest | 159 |
| Archivos únicos | 141 |
| Dominios ontología | 20 |
| Cobertura dominio (probe) | 100% |
| Eval 80 queries con RAG | 100% (80/80) |
| Conocimiento accesible (fuentes recuperadas) | 35.8% |
| Fuentes activas DB | 159 |
| Fuentes nunca recuperadas | 102 |

## Documentos por dominio

| Dominio | Entradas manifest | Probe OK |
|---|---|---|
| nelvyon | 38 | ✅ |
| business_strategy | 3 | ✅ |
| digital_marketing | 26 | ✅ |
| paid_ads | 7 | ✅ |
| seo | 5 | ✅ |
| content | 3 | ✅ |
| copywriting | 2 | ✅ |
| social_media | 4 | ✅ |
| email_marketing | 2 | ✅ |
| crm_sales | 17 | ✅ |
| automation | 4 | ✅ |
| saas | 4 | ✅ |
| analytics_reporting | 2 | ✅ |
| customer_support | 3 | ✅ |
| finance_operations | 8 | ✅ |
| design | 6 | ✅ |
| video | 4 | ✅ |
| development_tech | 14 | ✅ |
| security_privacy | 2 | ✅ |
| planning_strategy | 5 | ✅ |

## Dominios existentes

nelvyon, business_strategy, digital_marketing, paid_ads, seo, content, copywriting, social_media, email_marketing, crm_sales, automation, saas, analytics_reporting, customer_support, finance_operations, design, video, development_tech, security_privacy, planning_strategy

## Archivos multi-dominio (intencional)

- `docs/ARCHITECTURE.md` → nelvyon, development_tech
- `CLAUDE.md` → nelvyon, development_tech
- `docs/SERVICES_MASTER_PLAN.md` → nelvyon, digital_marketing, planning_strategy
- `docs/PARITY_GHL_HUBSPOT.md` → saas, crm_sales
- `docs/OS_LEARNING.md` → nelvyon, analytics_reporting
- `docs/services/LANDING_SOP.md` → content, digital_marketing
- `docs/services/PILOT_LANDING_PROJECT.md` → content, digital_marketing
- `docs/services/SERVICES_QA_MASTER.md` → nelvyon, planning_strategy
- `docs/agency-playbooks/SAAS_B2B_GROWTH_PACK_DIA_A_DIA.md` → digital_marketing, saas
- `docs/portfolio/CASE_STUDY_ECOMMERCE.md` → digital_marketing, saas
- `backend/local-ai/knowledge/domains/crm_email.md` → crm_sales, email_marketing
- `backend/local-ai/knowledge/domains/saas_analytics_tech.md` → saas, development_tech, analytics_reporting
- `backend/local-ai/knowledge/domains/content_copy_social.md` → copywriting, content, social_media
- `backend/local-ai/knowledge/domains/strategy_support.md` → planning_strategy, business_strategy
- `backend/local-ai/knowledge/domains/finance_strategy.md` → finance_operations, business_strategy

## Fuentes indexadas nunca recuperadas en probes (muestra)

- `kb:automation:bots_premium_nelvyon_v1.md`
- `kb:crm_sales:CLOSING_SCRIPT.md`
- `kb:crm_sales:DISCOVERY_CALL_SCRIPT.md`
- `kb:crm_sales:LINKEDIN_OUTREACH.md`
- `kb:crm_sales:NELVYON_CASE_STUDY_TEMPLATE.md`
- `kb:crm_sales:NELVYON_COMPANY_DECK.md`
- `kb:crm_sales:NELVYON_CONTRACT_CHECKLIST.md`
- `kb:crm_sales:NELVYON_PORTFOLIO_STRUCTURE.md`
- `kb:crm_sales:NELVYON_PRICING.md`
- `kb:crm_sales:NELVYON_PROPOSAL_TEMPLATE.md`
- `kb:crm_sales:OBJECTION_HANDLING.md`
- `kb:crm_sales:OUTREACH_EMAILS.md`
- `kb:crm_sales:PARITY_GHL_HUBSPOT.md`
- `kb:crm_sales:SALES_SOP.md`
- `kb:crm_sales:WHATSAPP_OUTREACH.md`
- `kb:design:branding_premium_nelvyon_v1.md`
- `kb:design:diseno_grafico_creatividades_premium_nelvyon_v1.md`
- `kb:design:fotografia_producto_premium_nelvyon_v1.md`
- `kb:design:LOGO_SOP.md`
- `kb:development_tech:DATABASE.md`
- `kb:development_tech:ENVIRONMENTS.md`
- `kb:development_tech:integraciones_apis_premium_nelvyon_v1.md`
- `kb:development_tech:INTEGRATIONS.md`
- `kb:development_tech:mantenimiento_web_premium_nelvyon_v1.md`
- `kb:development_tech:observability_v1_tuning_triage.md`
- `kb:development_tech:phase9_observability_jobs.md`
- `kb:development_tech:RAILWAY_DEPLOY_CHECKLIST.md`
- `kb:development_tech:voice_v2_pilot_runbook.md`
- `kb:development_tech:web_premium_nelvyon_v1.md`
- `kb:development_tech:WEB_SOP.md`
- `kb:digital_marketing:BEAUTY_AGENT.md`
- `kb:digital_marketing:CASE_STUDY_DENTAL.md`
- `kb:digital_marketing:CASE_STUDY_ECOMMERCE.md`
- `kb:digital_marketing:CASE_STUDY_GYM.md`
- `kb:digital_marketing:CASE_STUDY_LAW_FIRM.md`
- `kb:digital_marketing:CASE_STUDY_SOLAR.md`
- `kb:digital_marketing:COACHING_AGENT.md`
- `kb:digital_marketing:DENTAL_AGENT.md`
- `kb:digital_marketing:ECOMMERCE_AGENT.md`
- `kb:digital_marketing:ECOMMERCE_GROWTH_PACK_DIA_A_DIA.md`
- … y 62 más