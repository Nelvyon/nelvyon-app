# CEO / Daniel — Master actions (solo humano)

> Cursor cerró lo ejecutable. Esta lista es **mínima y exacta**.  
> Fecha: 2026-07-26 · `claimReady: false`

## A — Infra / DB / IA

| # | Acción | Doc | Tiempo |
|---|--------|-----|--------|
| 0 | **Primero:** 4 frases SÍ/NO puntos 1–4 | `CEO_POINTS_1_4_APPROVAL_REQUEST.md` | 5 min |
| 1 | Ack histórico 519/520 + política migrate | `PROD_MIGRATE_GATE_RUNBOOK.md` | 5 min |
| 2 | Ventana migrate futura: set/unset `NELVYON_PROD_MIGRATE_*` | idem | por mig |
| 3 | Dual-write ERP cutover SÍ/NO | `ERP_DUAL_WRITE_TRANSITION_RUNBOOK.md` | decisión |
| 4 | RAG Railway: apply schema staging (flags) o DB dedicada | `RAILWAY_PRIVATE_RAG_PREP_RUNBOOK.md` | 15–30 min |
| 5 | Canary IA prod SÍ/NO (no activar hoy) | `CEO_IA_PROD_CANARY_REQUEST.md` | decisión |

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
| 11 | Twilio dialer real | `TELEPHONY_PROVIDER_CEO_CHECKLIST.md` |
| 12 | Redes oficiales Nelvyon | `NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md` |

## D — Legal / mercado

| # | Acción |
|---|--------|
| 13 | Pepito / mass-send legal review |
| 14 | Evidencia clientes / mercado (bloquea READY) |

## Prohibido sin firma

OpenAI · Ads spend · publish/DM real · llamadas reales · MCP/SM/OpenClaw prod · Pepito · 2ª réplica de pago · Play/App Store paid
