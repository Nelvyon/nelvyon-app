# DEPLOY FINAL — Nelvyon Production Checklist

> Estado: **Código completado** (Fases 1–12, S13, S14, S15). Este documento cubre el deploy final en Railway.

---

## Resumen de fases completadas

| Fase | Descripción | Commit |
|---|---|---|
| Fase 1 | Servicios reales: pipeline, inbox, calendar, team, webhooks, api-keys, snippets, lead-scoring, CSV | `99b520f` |
| Fase 2 | Sequences, A/B testing, Twilio SMS, Forms→workflow | `3d32c9c` |
| Fase 9 | OS Autónomo real: packOrchestrator, seeds, QA gate, CEO metrics | `fb19b63` |
| Fase 10 | Omnicanal: WhatsApp BFF, Social Publish, Funnels multi-step, Web Builder, Calendar booking | `53e5ad5` |
| Fase 10b | Calendar contact email + citas SES booking confirm | `aef4dec` |
| Fase 11 | Ads & Performance: Meta/Google campaigns, ROAS alerts, UTM en reportes | `aa92526` |
| Fase 12 | LMS cursos/matrículas/certificados, Klaviyo connector, SMS→/api/saas, CI gate | `a7db3a0` |
| S13 | Helpdesk, Integraciones, SEO, Reputación GBP, Store BFF Stripe, CI anti-v1 gate | d4c760a |
| S14 | Funnels analytics/publish, Web Builder renderHtml/custom_domain/publish, PDF export, migration 429 | f849570 |
| S15 | Inbox omnicanal: reply SMS/WA/email, workflow send_sms/send_whatsapp, UI dispatch feedback | (current) |

---

## Variables de entorno requeridas

Ver `docs/LAUNCH_READY.md` para el listado completo. Variables mínimas para producción:

```bash
# Auth
JWT_SECRET=<min 32 chars>
NEXTAUTH_SECRET=<random>
NEXTAUTH_URL=https://app.nelvyon.com
NEXT_PUBLIC_APP_URL=https://app.nelvyon.com

# DB
DATABASE_URL=postgresql://...

# Email (AWS SES)
SES_REGION=eu-west-1
SES_ACCESS_KEY_ID=...
SES_SECRET_ACCESS_KEY=...
SES_FROM_EMAIL=noreply@nelvyon.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_AGENCY=price_...

# Cron
CRON_SECRET=<random>

# Twilio (SMS + WhatsApp)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+34...
TWILIO_FROM_WHATSAPP=+14155238886

# SEO (opcional — sin clave muestra empty state)
SEMRUSH_API_KEY=
SEO_DOMAIN=app.nelvyon.com

# Reputación / Google Business Profile (opcional)
GOOGLE_PLACES_API_KEY=
GBP_PLACE_ID=
```

---

## Migraciones de base de datos

Ejecutar en orden numérico desde `backend/db/migrations/`:

```bash
# En Railway: ejecutar en la consola de Postgres o via psql
psql $DATABASE_URL -f backend/db/migrations/001_*.sql
# ... hasta
psql $DATABASE_URL -f backend/db/migrations/427_saas_lms.sql
```

**Última migración:** `429_web_pages_custom_domain.sql` (añade `custom_domain` a `saas_web_pages`)

---

## Checklist de deploy

### Pre-deploy
- [ ] Todas las variables de entorno configuradas en Railway
- [ ] `DATABASE_URL` apunta a Postgres 16 en Railway
- [ ] SES email verificado en AWS (sender domain)
- [ ] Stripe webhook endpoint configurado: `https://app.nelvyon.com/api/billing/webhook`

### Deploy
```bash
# 1. Push a main (Railway detecta automáticamente)
git push origin main

# 2. Ejecutar migraciones en producción
node -e "require('./apps/web/src/lib/db/migrate')" || pnpm -C apps/web migrate

# 3. Verificar health
curl -sf https://app.nelvyon.com/api/health | grep '"ok":true'
```

### Post-deploy verificación
```bash
# P0 smokes
node scripts/run-staging-p0-smokes.mjs --base-url https://app.nelvyon.com

# CI check (no v1 refs en páginas saas)
node scripts/check-no-v1-saas-pages.mjs

# TypeCheck
pnpm -C apps/web exec tsc --noEmit

# Tests
pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm --reporter=dot
```

---

## Módulos disponibles en producción

### ✅ Operativos (API real + UI + tests)
- CRM (contactos, deals, pipeline)
- Campañas email (SES, bounce handling)
- Workflows (scheduled + trigger, idempotencia 4min)
- Billing + Stripe webhook
- Inbox omnicanal (email, SMS, WhatsApp, Instagram, Facebook, chat)
- SMS Marketing (Twilio)
- WhatsApp Business (Twilio)
- Social Publish (Meta + LinkedIn + Twitter/X)
- Funnels multi-step
- Web Builder (páginas)
- Calendar + booking email (SES)
- Citas (appointmentss con email confirm)
- Publicidad Digital (Meta Ads + Google Ads, campañas, ROAS alerts)
- UTM / Atribución
- Reportes (PDF ejecutivo + panel UTM)
- LMS (cursos, módulos, matrículas, certificados)
- Klaviyo connector (listas, campañas, profiles)
- OS Packs (local-business, ecommerce, saas-b2b) — auto-approve QA ≥ 85
- Portal cliente BFF
- CEO metrics dashboard (datos reales)
- A/B Testing
- Lead Scoring
- Snippets, API Keys, Webhooks, Team

### 🚫 Coming soon (desactivado — sin kickoff route)
- Afiliados, Dialer avanzado, LMS (versión legacy), Loyalty, Web Builder v1, Social v1

---

## Arquitectura de producción

```
Railway (Node 20)
├── apps/web (Next.js 15 App Router — port 3000)
│   ├── /saas/* — SaaS CRM + módulos (requireSaasContext)
│   ├── /os/*  — OS packs (OS agents, auto-approve)
│   ├── /portal/* — Agency portal BFF
│   └── /store/[subdomain] — Public Stripe checkout
├── backend/main.py (FastAPI — port 8000, en proceso de migración)
└── Railway Postgres 16

CDN / DNS
└── app.nelvyon.com → Railway service
```

---

## Contacto y soporte

- Repo: https://github.com/Nelvyon/nelvyon-app
- Issues: GitHub Issues
- Deploy target: Railway → app.nelvyon.com
