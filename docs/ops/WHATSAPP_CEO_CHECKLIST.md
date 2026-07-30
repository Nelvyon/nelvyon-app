# Checklist CEO — WhatsApp Business Cloud

> **2026-07-30** · `claimReady: false` · código: `SaasWhatsAppCloudService` · webhook `/api/webhooks/whatsapp`  
> No inventar tokens. No enviar mensajes masivos sin legal.

## Estado in-repo

- API SaaS: `/api/saas/whatsapp` · templates · catalog  
- Webhook Meta: `GET/POST /api/webhooks/whatsapp` (verify + signature via `META_WA_APP_SECRET`)  
- Catálogo hub: status **beta** hasta WABA real  
- Fallback Twilio WA: `TWILIO_FROM_WHATSAPP` + Twilio SMS keys (opcional)

## Variables (Railway `@nelvyon/web`)

| Variable | Dónde obtenerla |
|----------|-----------------|
| `META_WA_PHONE_NUMBER_ID` | Meta Business → WhatsApp → Phone numbers |
| `META_WA_ACCESS_TOKEN` | System user / permanent token (nunca en git) |
| `META_WA_VERIFY_TOKEN` | String que tú defines; mismo valor en Meta webhook |
| `META_WA_APP_SECRET` | Meta App → Settings → Basic → App Secret |
| `META_WA_BUSINESS_ACCOUNT_ID` | Opcional (WABA id) |
| `META_WA_CATALOG_ID` | Opcional (commerce) |

## Pasos exactos (humano)

1. Crear / usar Meta App con producto **WhatsApp**.
2. Añadir número WABA y completar verificación de negocio.
3. En Webhooks: Callback URL  
   `https://app.nelvyon.com/api/webhooks/whatsapp`  
   (o el host de `NEXT_PUBLIC_APP_URL`) · Verify Token = valor de `META_WA_VERIFY_TOKEN`.
4. Suscribir campos: `messages`, `message_template_status_update` (mínimo).
5. Pegar secrets en Railway (tabla superior).
6. Aprobar plantillas en Meta antes de envíos template.
7. Smoke: un mensaje de prueba a número propio · sin bulk.

## Prohibido

Mass-send · Pepito · tokens en chat/git · activar sin App Secret en prod.
