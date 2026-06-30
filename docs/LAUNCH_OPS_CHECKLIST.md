# LAUNCH_OPS_CHECKLIST — Nelvyon producción

> Actualizado: 2026-06-29  
> Prod: https://nelvyon.com  
> Origin HEAD desplegado: `00ea93e9`  
> Local pendiente push: `f2e9f987` (BFF fallback 401/403) + smoke B4 SSR

---

## Tabla de gates (última corrida Cursor)

| Gate | Resultado | Notas |
|---|---|---|
| Typecheck | ✅ PASS | `tsc --noEmit` exit 0 |
| Pytest | ✅ PASS | 909 passed |
| Vitest | ✅ PASS | 2071 passed (sesión previa) |
| P0 smokes prod | ✅ PASS | `ALL_P0_PASS` (portal, local, ecommerce, saas-b2b) |
| OS pack gate | ✅ PASS | `ALL_GATE_PASS` 8/8 fixtures |
| c6-reputacion | ✅ PASS | |
| p1-partners | ✅ PASS | 1 WARN billing BFF 404 |
| a1-packs | ✅ PASS | |
| visual-polish | ✅ PASS | |
| c1-ads | ❌ FAIL | google/meta/roas status → 401 upstream |
| c2-social | ❌ FAIL | monitoring/scheduler → 401 |
| c3-funnels | ❌ FAIL | API list → 401 |
| c4-ecommerce | ❌ FAIL | API list → 401 |
| c5-automations | ❌ FAIL | workflows/rules → 401 |
| b1-b4 | ❌ FAIL | CRM/tickets API 401; reportes SSR (fix en local) |
| Autonomous gate prod | ⚠️ | Requiere `--base-url https://nelvyon.com` + `CRON_SECRET` |

**Veredicto actual: NO LAUNCH_READY** — código listo en local; prod aún en `00ea93e9`.

---

## Desbloqueo inmediato (5 min)

```powershell
git push origin main   # sube f2e9f987 + smoke B4
# Esperar deploy Railway (~3 min)
$env:STAGING_BASE_URL="https://nelvyon.com"
node scripts/staging-smoke-c1-ads.mjs --skip-wait
node scripts/staging-smoke-c2-social.mjs --skip-wait
node scripts/staging-smoke-c3-funnels.mjs --skip-wait
node scripts/staging-smoke-c4-ecommerce.mjs --skip-wait
node scripts/staging-smoke-c5-automations.mjs --skip-wait
node scripts/staging-smoke-b1-b4.mjs --skip-wait
$env:BASE_URL="https://nelvyon.com"
node scripts/run-os-autonomous-gate.mjs --base-url https://nelvyon.com
```

Criterio verde: todos `ALL_CRITICAL_PASS` + `ALL_GATE_PASS`.

---

## Ops manual — obligatorio antes de clientes reales

### 1. Railway — variables core

| Variable | Acción |
|---|---|
| `JWT_SECRET` | ≥32 chars — `openssl rand -hex 32` |
| `TRACKING_SECRET` | ≥32 chars (o igual que JWT) |
| `NEXTAUTH_SECRET` | generar |
| `NEXTAUTH_URL` | `https://nelvyon.com` |
| `NEXT_PUBLIC_APP_URL` | `https://nelvyon.com` (sin slash final) |
| `DATABASE_URL` | Postgres 16 vinculado |
| `CRON_SECRET` | generar — protege crons |

### 2. AWS SES (email campañas)

| Paso | Detalle |
|---|---|
| Verificar dominio | SPF + DKIM en DNS |
| Variables | `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL` |
| SNS webhook | Confirmar suscripción → `POST /api/webhooks/ses` |
| Smoke | Enviar campaña test → comprobar open pixel |

### 3. Stripe (billing SaaS)

| Paso | Detalle |
|---|---|
| Live keys | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Price IDs | STARTER, PRO, AGENCY (+ AGENCY_PARTNER si partners) |
| Webhook | `checkout.session.completed` → actualiza `saas_tenants.plan` |

### 4. Railway crons

| Endpoint | Frecuencia | Header |
|---|---|---|
| `POST /api/cron/saas-workflows` | 5 min | `Authorization: Bearer $CRON_SECRET` |
| `POST /api/cron/workflow-date` | diario 00:05 UTC | idem |
| `POST /api/os/cron/pack-status` | 10 min | idem |
| `POST /api/cron/os-recurring-services` | según runbook | idem |

### 5. OAuth integraciones (opcional v1, live en hub)

HubSpot, Slack, Meta, Google, LinkedIn, TikTok — credenciales en Railway.  
UI en `/saas/integraciones` muestra estado real; sin credenciales → `oauth_configured: false`.

### 6. OS autónomo (post-regresión verde)

```bash
AUTONOMOUS_PRODUCTION=true   # solo tras ALL_GATE_PASS en prod
```

### 7. Migraciones

```bash
pnpm -C apps/web migrate
```

Todas 400–426 en main. Ejecutar en Railway shell si hay drift.

---

## Post-launch (no bloqueante)

- [ ] 12 conectores `coming_soon` (Salesforce, Pipedrive, Zoho…)
- [ ] HubSpot/Slack token exchange real en FastAPI (hoy demo mode Python)
- [ ] GitHub Actions `staging-smoke-p0.yml` cron continuo
- [ ] Skin dark `#020817` verificado en browser prod `/saas/dashboard`

---

## Referencias

- Código: `docs/LAUNCH_READY.md`
- Railway detalle: `docs/RAILWAY_DEPLOY_CHECKLIST.md`
- Smokes P0: `docs/STAGING_P0_SMOKES.md`
- Orquestador: `node scripts/run-staging-p0-smokes.mjs --skip-wait`
