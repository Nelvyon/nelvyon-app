# OPS — Stripe producción (checklist humana mínima)

Código listo: firma SDK, idempotencia `stripe_webhook_events`, tests unitarios webhook.

## Estado 2026-07-30

Core vars en Railway (`sk_live`, webhook, PRICE_ID_*).  
**KI-028 cerrado → KI-R028** (2026-07-22): price-audit **allValid=true** (STARTER/PRO/AGENCY).  
`STRIPE_PRICE_ID_AGENCY_PARTNER` sigue opcional.  
No se crean cobros desde el agente.

## Variables (Railway / prod)

| Variable | Uso |
|----------|-----|
| `STRIPE_SECRET_KEY` | `sk_live_…` (alias `STRIPE_API_KEY`) |
| `STRIPE_WEBHOOK_SECRET` | `/api/webhooks/stripe` |
| `STRIPE_WEBHOOK_CONNECT_SECRET` | `/api/webhooks/stripe-connect` |
| `STRIPE_STORE_WEBHOOK_SECRET` | `/api/webhooks/stripe-store` (HMAC) |
| `STRIPE_PRICE_ID_STARTER/PRO/AGENCY` | Prices live |
| `NEXT_PUBLIC_APP_URL` | Return URLs |

Validación: `missingStripeEnvKeys()` · smoke `GET /api/billing/price-audit` + `x-cron-secret`.

## Acciones humanas (exactas)

1. Confirmar Live keys en Railway (rotar solo en ventana de mantenimiento).
2. Webhooks → endpoint `https://app.nelvyon.com/api/webhooks/stripe` (o host canónico) · eventos checkout/subscription/invoice.
3. Connect / Store secrets si se usan esos endpoints.
4. Revalidar price-audit tras cualquier cambio de Price ID.
5. Pago test controlado (1 €) solo con checklist firmada — **no** desde Cursor.

## No hacer desde el agente

- No pegar keys en git
- No cobrar clientes reales sin checklist firmada
- No rotar webhooks en prod sin ventana de mantenimiento
