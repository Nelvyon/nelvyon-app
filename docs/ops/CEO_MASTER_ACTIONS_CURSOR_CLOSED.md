# CEO / Daniel — Master actions (solo humano)

> Cursor cerró lo ejecutable. Esta lista es **mínima y exacta**.  
> Fecha: 2026-07-30 · Fase 1 DONE · Fase 2 prep in-repo DONE · SSOT `PHASE2_EXTERNAL_INTEGRATIONS.md` · canary KILL · `claimReady: false`

## A — Infra / DB / IA

| # | Acción | Doc | Tiempo |
|---|--------|-----|--------|
| 0 | ~~4 frases SÍ/NO~~ → **ADR-067 decidido** (1 SÍ / 2–4 NO) | `CEO_POINTS_1_4_APPROVAL_REQUEST.md` | hecho |
| **1** | ~~SÍ/NO migrar prod 521+522~~ → **DONE** tip `3f10c272` | `PROD_MIGRATE_521_522_RUNBOOK.md` | **hecho** |
| 2 | Dual-write ERP — **NO hasta nuevo SÍ** | `ERP_DUAL_WRITE_TRANSITION_RUNBOOK.md` | diferido |
| 3 | RAG Railway apply — **NO hasta nuevo SÍ** | `RAILWAY_PRIVATE_RAG_PREP_RUNBOOK.md` | diferido |
| 4 | Canary IA prod — **NO hasta nuevo SÍ** | `CEO_IA_PROD_CANARY_REQUEST.md` | diferido |

## B — Dispositivos

| # | Acción | Comando / pasos |
|---|--------|-----------------|
| 6 | Android | Conectar teléfono/AVD → `node scripts/android-one-step.mjs` → login SaaS → confirmar CRM |
| 7 | iOS Safari | `PWA_IOS_SAFARI_CEO_CHECKLIST.md` (3 pasos) |

## C — Proveedores (cuentas reales · OFF spend/publish/call)

| # | Acción | Doc |
|---|--------|-----|
| 8 | Google / Meta / LinkedIn OAuth apps | `OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md` |
| 9 | Social publish OAuth (sigue publish OFF) | `SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md` |
| 10 | Ads OAuth (spend OFF) | `ADS_OAUTH_SPEND_CEO_CHECKLIST.md` |
| 11 | Twilio dialer / SMS real | `TELEPHONY_PROVIDER_CEO_CHECKLIST.md` |
| 11b | WhatsApp Cloud | `WHATSAPP_CEO_CHECKLIST.md` |
| 12 | Redes oficiales Nelvyon | `NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md` |
| 12b | SES primer envío externo + SNS host único | `OPS_SES_PROD.md` |
| 12c | Stripe Live reval price-audit / pago test | `OPS_STRIPE_PROD.md` |

## D — Legal / mercado

| # | Acción |
|---|--------|
| 13 | Pepito / mass-send legal review |
| 14 | Evidencia clientes / mercado (bloquea READY) |

## Prohibido sin firma

OpenAI · Ads spend · publish/DM real · llamadas reales · MCP/SM/OpenClaw prod · Pepito · 2ª réplica de pago · Play/App Store paid · orchestrator prod (`NELVYON_ORCHESTRATOR_ENABLED`)
