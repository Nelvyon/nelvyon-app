# OPS — Stripe producción (checklist humana mínima)

Código listo: firma SDK, idempotencia `stripe_webhook_events`, tests unitarios webhook.

## Estado 2026-07-21

Core vars presentes en Railway (`sk_live`, webhook, PRICE_ID_*).  
**Bloqueo:** `price-audit` → STARTER `resource_missing` (**KI-028**). PRO/AGENCY OK.  
No se crearon cobros ni precios desde el agente.

## Variables (Railway / prod)

| Variable | Uso |
|----------|-----|
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `/api/webhooks/stripe` |
| `STRIPE_WEBHOOK_CONNECT_SECRET` | `/api/webhooks/stripe-connect` |
| `STRIPE_STORE_WEBHOOK_SECRET` | `/api/webhooks/stripe-store` (HMAC) |
| `STRIPE_PRICE_ID_STARTER/PRO/AGENCY` | Prices live |
| `NEXT_PUBLIC_APP_URL` | Return URLs |

Validación in-repo: `missingStripeEnvKeys()` / `missingStripeStoreWebhookSecret()` en `backend/saas/saasEnv.ts`.

## Acciones humanas (exactas)

1. Stripe Dashboard → Developers → API keys → copiar **live** secret a Railway.
2. Webhooks → Add endpoint `https://<host>/api/webhooks/stripe` → eventos checkout/subscription/invoice → copiar signing secret.
3. Endpoint Connect (si partners) → `…/stripe-connect` → secret a `STRIPE_WEBHOOK_CONNECT_SECRET`.
4. Store webhook si se usa tienda → secret a `STRIPE_STORE_WEBHOOK_SECRET`.
5. Products → Prices mensuales → IDs a `STRIPE_PRICE_ID_*`.
6. Smoke: `GET /api/billing/price-audit` con header `x-cron-secret: CRON_SECRET`.
7. Pago test live de 1 € o modo test end-to-end antes de marketing.

## No hacer desde el agente

- No pegar keys en git
- No cobrar clientes reales sin checklist firmada
- No rotar webhooks en prod sin ventana de mantenimiento
