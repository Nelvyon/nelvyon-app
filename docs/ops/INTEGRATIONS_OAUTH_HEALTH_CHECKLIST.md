# Integrations — OAuth / credentials / health checklist

> Derivado de `docs/INTEGRATIONS.md` · **2026-07-22**  
> **No crear cuentas** · **no gastar** · solo verificar presencia de vars/código y health HTTP cuando exista.  
> ✅ verificado · 🟡 código/vars · ❌ no implementado · ⬜ humano pendiente

## Cómo usar

1. Por proveedor: confirmar env en Railway (nombres, no valores).  
2. Si hay endpoint health/status: GET y anotar código.  
3. OAuth: redirect URI alineado con `NEXT_PUBLIC_APP_URL` — sin rotar secrets aquí.

## Matriz por proveedor

| Provider | Creds / OAuth vars | Health / status path | Estado | Acción humana |
|----------|--------------------|----------------------|--------|---------------|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_*` | Billing APIs / price-audit | ✅ | Mantener webhook live |
| AWS SES | `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL` | Campañas `ses_configured` | ✅ | SNS subscription OK |
| Google Ads | `GOOGLE_ADS_*`, `GOOGLE_CLIENT_ID/SECRET` | OAuth authorize/status | 🟡 | Completar OAuth prod si se usa |
| Meta Ads | `META_*`, `META_ACCESS_TOKEN` | OAuth / WA verify | 🟡 | Tokens + plantillas WA |
| LinkedIn Ads | `LINKEDIN_CLIENT_ID/SECRET` | OAuth | 🟡 | |
| TikTok Ads | `TIKTOK_APP_ID/SECRET`, `TIKTOK_ACCESS_TOKEN` | OAuth | 🟡 | |
| Snapchat | `SNAPCHAT_*` | Catálogo | 🟡 | |
| GA4 | OAuth Google | Status | 🟡 | |
| Search Console | OAuth Google | Status | 🟡 | |
| PostHog | `NEXT_PUBLIC_POSTHOG_*` | — | 🟡 | |
| Semrush | `SEMRUSH_API_KEY` | — | 🟡 | |
| WhatsApp Cloud | `META_WA_*` | Verify token webhook | 🟡 | |
| Telegram | `integration_telegram` token | Bot probe | 🟡 | |
| Twilio | `TWILIO_*` | — | 🟡 | |
| HubSpot | OAuth | Sync | 🟡 | |
| Salesforce | OAuth catalog | — | 🟡 | |
| Shopify | OAuth | — | 🟡 | |
| Slack | Workflow notify | — | 🟡 | Sin OAuth dedicado |
| Discord | — | — | ❌ | |
| Gmail API | — | — | ❌ | |
| Google Calendar | OAuth + `GOOGLE_CALENDAR_ID` | — | 🟡 | |
| Ollama | `OLLAMA_HOST` privado | `probeOllamaHealth` | 🟡 prep | CEO mesh — **OFF** |
| OpenAI | `OPENAI_API_KEY` + allow flag | — | OFF revoked | No reactivar |
| OpenClaw | bridge flags | — | OFF | |
| MCP Productivo | `NELVYON_MCP_PRODUCTIVE_ENABLED` | `/api/saas/mcp` | CERT / OFF flag | |
| Shared Memory | `NELVYON_SHARED_MEMORY_ENABLED` | verify scripts | OFF | |

## Smoke sugerido (ops)

```bash
# Web
curl -sf https://app.nelvyon.com/api/health/live
curl -sf https://app.nelvyon.com/api/health/ready
# Automations unauth → 401 expected
curl -s -o /dev/null -w "%{http_code}" https://nelvyon.com/api/saas/automations
```

## Reglas

- No imprimir secretos en logs/docs/chat.  
- No crear providers cloud nuevos en este checklist.  
- Fallo OAuth ≠ mock silencioso: UI debe mostrar `coming_soon` / `beta` / error honesto.
