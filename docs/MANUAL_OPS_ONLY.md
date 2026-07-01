# Manual ops only — Nelvyon producción

> Todo lo demás está en código. Solo esto requiere configuración manual en Railway / AWS / proveedores externos.

## Obligatorio para 100% salud en `/saas/setup`

| Variable | Dónde | Desbloquea |
|---|---|---|
| `DATABASE_URL` | Railway Postgres | Todo el SaaS |
| `JWT_SECRET` (≥32 chars) | Railway | Auth |
| `SES_ACCESS_KEY_ID` | AWS IAM | Email campañas |
| `SES_SECRET_ACCESS_KEY` | AWS IAM | Email campañas |
| `SES_FROM_EMAIL` | SES verificado | Email campañas |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | Billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook | Planes |
| `STRIPE_PRICE_ID_STARTER` | Stripe Products | Checkout |
| `STRIPE_PRICE_ID_PRO` | Stripe Products | Checkout |
| `STRIPE_PRICE_ID_AGENCY` | Stripe Products | Checkout |
| `TWILIO_ACCOUNT_SID` | Twilio | SMS, dialer, WhatsApp fallback |
| `TWILIO_AUTH_TOKEN` | Twilio | SMS, dialer |
| `TWILIO_FROM_NUMBER` | Twilio | SMS, dialer |

## OAuth (por tenant, desde `/saas/integraciones`)

| Proveedor | Variables plataforma | Acción usuario |
|---|---|---|
| Meta (Ads + Social) | `META_APP_ID`, `META_APP_SECRET` | Conectar cuenta |
| Google (Ads + Analytics) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Conectar cuenta |
| HubSpot (conector) | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET` | Conectar cuenta |

## Opcional / enterprise

| Item | Notas |
|---|---|
| `ELEVENLABS_API_KEY` | Voz IA `/saas/voice` |
| Stripe Connect | Subcuentas agencia |
| SNS bounce subscription | SES deliverability |
| `CRON_SECRET` | Workflows programados |
| Upstash Redis | Rate limits / colas |

## Plantilla Envato (visual top mundial)

- **Una plantilla oficial:** Landrick SaaS Pro (`nelvyon-landrick-saas`, Envato #59963825)
- **Importar:** `/saas/web-builder` o `/saas/setup` → «Importar en 1 clic»
- **No requiere ZIP local** — secciones premium pre-mapeadas por Nelvyon
- **Preview thumbnail:** CDN Envato en la tarjeta de plantilla

## Comandos post-deploy

```bash
pnpm -C apps/web migrate
pnpm -C apps/web build
node scripts/run-staging-p0-smokes.mjs --skip-wait
```

## Lo que NO es manual

- 59 módulos SaaS UI + API
- Plantillas workflows, secuencias, formularios, funnels
- Kit arranque Nelvyon
- Health score `/saas/setup`
- Web builder + import plantilla Envato
- Packs OS E2E
