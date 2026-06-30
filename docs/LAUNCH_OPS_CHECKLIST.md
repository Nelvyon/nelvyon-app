# LAUNCH_OPS_CHECKLIST — Nelvyon producción

> Actualizado: 2026-06-30  
> Prod: https://nelvyon.com  
> Sprint Claude: leer `docs/CLAUDE_SPRINT_ELITE.md`

---

## Veredicto código (jun-2026)

| Gate | Estado |
|---|---|
| Regresión OS c1–c6, b1-b4, P0, visual, autonomous | ✅ VERDE |
| 59/59 SaaS API | ✅ |
| Smoke 59 módulos | `node scripts/staging-smoke-saas-all-modules.mjs --skip-wait` |
| **CÓDIGO ÉLITE** | ✅ tras smoke 59 ALL_PASS |
| **OPS clientes reales** | ❌ manual abajo |

---

## Checklist OPS — USUARIO SOLO (con curl)

Marca `[x]` cuando completes. Claude **no puede** hacer estos pasos.

### Core Railway

- [ ] `JWT_SECRET` (≥32 chars)
- [ ] `TRACKING_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`
- [ ] `DATABASE_URL` + migraciones

```bash
# Verificar health
curl -s -o /dev/null -w "%{http_code}" https://nelvyon.com/api/health/live
# Esperado: 200
```

```bash
# Railway shell
pnpm -C apps/web migrate
```

### AWS SES (email)

- [ ] Dominio verificado SPF + DKIM
- [ ] `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL`
- [ ] SNS suscripción → `POST /api/webhooks/ses`

```bash
# Tras login SaaS en browser, o con cookie nelvyon_token:
curl -s https://nelvyon.com/api/saas/campanias -H "Cookie: nelvyon_token=TOKEN"
# Esperado: JSON con ses_configured: true
```

### Stripe (billing)

- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_ID_STARTER`, `_PRO`, `_AGENCY`
- [ ] Webhook `checkout.session.completed` en Stripe Dashboard

```bash
curl -s https://nelvyon.com/api/saas/billing -H "Cookie: nelvyon_token=TOKEN"
# Esperado: 200 + plan del tenant
```

### Crons

- [ ] `CRON_SECRET` en Railway

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://nelvyon.com/api/cron/saas-workflows
# Esperado: 200
```

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://nelvyon.com/api/os/cron/pack-status
```

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://nelvyon.com/api/cron/os-recurring-services
```

### OAuth integraciones

- [ ] Meta, Google Ads, LinkedIn, HubSpot, Slack en Railway
- [ ] Conectar en https://nelvyon.com/saas/integraciones

### OS autónomo

- [ ] `AUTONOMOUS_PRODUCTION=true` (solo tras `ALL_GATE_PASS`)

```bash
$env:BASE_URL="https://nelvyon.com"
node scripts/run-os-autonomous-gate.mjs --base-url https://nelvyon.com
```

### Envato plantillas (opcional, local)

- [ ] Descargas `.bat` — **no commitear** metadata masivo
- [ ] Post-launch biblioteca assets

---

## Referencias

- Inventario 98 frentes: `docs/INVENTARIO_FRENTES.md`
- Paridad GHL/HubSpot: `docs/PARITY_GHL_HUBSPOT.md`
- Sprint Claude: `docs/CLAUDE_SPRINT_ELITE.md`
- Código launch: `docs/LAUNCH_READY.md`
