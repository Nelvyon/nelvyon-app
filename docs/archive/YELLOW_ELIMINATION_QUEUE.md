# Eliminación de amarillos — cola ordenada

> Actualizado: **2026-07-17** · **Cola de amarillos internos: VACÍA**  
> Solo permanecen `BLOCKED_EXTERNAL` demostrados. Shared Memory / OpenClaw / Orquestador / Agentes: **no iniciar**.

## Resultado del drain

| Decisión | Cantidad |
|----------|----------|
| ✅ CERTIFIED (HTTP live + evidencia) | **14** módulos de cola (+ Router/Especialización/MCP congelados) |
| BLOCKED_EXTERNAL (evidencia objetiva) | **14** |
| 🟡 Amarillo interno pendiente | **0** |

Orquestador: `scripts/run-yellow-queue-drain.mjs` · consola: `docs/evidence/os-saas-e2e/yellow_queue_drain_console.txt`

## CERTIFIED (evidencia en `docs/evidence/os-saas-e2e/modules/`)

| # | Módulo | Evidencia |
|---|--------|-----------|
| 0 | `e2e.live_multitenant` | `../live_multitenant_latest.json` |
| 1 | `saas.auth.jwt` | `saas.auth.jwt_latest.json` |
| 2 | `saas.crm.contacts` | `saas.crm.contacts_latest.json` |
| 3 | `saas.crm.pipeline` | `saas.crm.pipeline_latest.json` (16/16) |
| 4 | `saas.crm.lead_scoring` | `saas.crm.lead_scoring_latest.json` (14/14) |
| 5 | `saas.tenants.team_rbac` | `saas.tenants.team_rbac_latest.json` (8/8) |
| 6 | `saas.workflows` | `saas.workflows_latest.json` (13/13) |
| 7 | `saas.tenants.api_keys` | `saas.tenants.api_keys_latest.json` (11/11) |
| 8 | `saas.tenants.webhooks` | `saas.tenants.webhooks_latest.json` (12/12) |
| 9 | `portal.client` | `portal.client_latest.json` (7/7) |
| 10 | `saas.inbox` | `saas.inbox_latest.json` (8/8) |
| 11 | `saas.analytics` | `saas.analytics_latest.json` (7/7) |
| 12 | `public.api` | `public.api_latest.json` (7/7) |
| 13 | `ai.private_ai` | `ai.private_ai_latest.json` (7/7) |

Congelados (no reabrir): Router · Especialización `v6_cert_fixed` · MCP Productivo.

## BLOCKED_EXTERNAL (solo externos)

| Módulo | Motivo objetivo |
|--------|-----------------|
| `os.packs.growth` | Kickoff E2E completo requiere staging/LLM (`STAGING_*` unset); unauth fail-closed OK |
| `os.platform` | Operator auth + staging para pack-report profundo |
| `saas.billing.stripe` | Sin `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` en cert |
| `saas.email.campaigns` | KI-013/014 SES domain + sandbox |
| `saas.email.sequences` | Mismo SES KI-013/014 |
| `saas.ads` | OAuth Google/Meta no conectado |
| `saas.social` | OAuth social no conectado |
| `saas.seo` | Providers SEO externos (Semrush) no configurados |
| `saas.comms.twilio_wa` | Twilio credentials ausentes |
| `saas.auth.sso` | IdP SAML/OIDC ausente |
| `saas.autopilot` | Canales externos/ops |
| `platform.ads.bff` | Tokens vendor OAuth |
| `platform.ecommerce.bff` | Credenciales store externas |
| `ai.ollama_rag_dual` | Deuda SSOT dual stack; Router path ya CERTIFIED (no tocar) |

## Bugs corregidos durante el drain

1. **Lead scoring** — snapshot/list SQL: `company_name` → `c.company`; join `saas_campaign_contacts` (inexistente) → `saas_campania_recipients`
2. **Workflows create** — params jsonb sin `JSON.stringify` → 500 `22P02`; fixed en `SaasWorkflowService`
3. **Cert harness** — stage inválido `prospecting`; path evidencia `scripts/docs` → `docs/`; retry 429 register

## Regla

Un módulo solo pasa a ✅ con evidencia JSON en `docs/evidence/os-saas-e2e/modules/`.  
**Próximo:** certificación global final NELVYON (solo cuando se autorice; OS/SaaS **NO** declarar COMPLETADOS aún sin esa pasada).
