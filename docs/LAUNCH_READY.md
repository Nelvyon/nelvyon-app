# LAUNCH_READY — Nelvyon producción

> Generado: 2026-06-24  
> Estado: **CÓDIGO TERMINADO — usuario puede hacer deploy manual**

---

## Checklist de código ✅

| Área | Estado | Commit | Evidencia |
|---|---|---|---|
| Agency E2E (packOrchestrator + dbAutoApprovePackDeliverables) | ✅ | `9c6ce26` | `runGrowthPack` auto-aprueba si QA≥85 sin operador |
| SaaS: /crm legacy → redirect /saas/crm | ✅ | `2672dea` | `apps/web/src/app/crm/page.tsx` — `redirect("/saas/crm")` |
| SaaS: contacto sin email → bounced (no crash) | ✅ | `2672dea` | `backend/saas/SaasCampaniasService.ts` |
| SaaS: workflow scheduled idempotencia (4 min window) | ✅ | `2672dea` | `backend/saas/SaasWorkflowService.ts` |
| SaaS: billing badge lee plan real desde DB | ✅ | `08b2f2f` | `dynamic="force-dynamic"` + Stripe webhook UPDATE |
| SaaS: empty state honesto si SES no configurado | ✅ | `2672dea` | banner amber en `/saas/campanias` y `/saas/workflows` |
| SaaS: SaasShellLayout en TODOS /saas/* (41 páginas) | ✅ | `2672dea` | `scripts/migrate-saas-shell.mjs` + fix-up |
| Packs: SKU mapping documentado en servicePacksCatalog.ts | ✅ | `2672dea` | comentario `NELVYON-LANDING + NELVYON-SEO + NELVYON-CHATBOT` |
| Packs: kickoff routes responden (local, ecommerce, saas-b2b) | ✅ | previo | `/api/os/packs/[packId]/kickoff/route.ts` |
| Packs: CEO metrics dashboard lee datos reales de DB | ✅ | previo | `fetchLocalPackCeoMetrics` + `usePackReportLatest` → `/api/platform/pack-report` |
| TypeScript: 0 errores (`pnpm exec tsc --noEmit`) | ✅ | `2672dea` | salida vacía = sin errores |
| Vitest: 0 fallos (52 test files, 489 tests) | ✅ | `2672dea` | `backend/saas backend/email src/features/saas-crm` |

### Restricciones respetadas
- ❌ No hay UI sin API (todos los estados consumen endpoints reales)
- ❌ No hay mock silencioso en prod (SES ausente → error visible en UI)
- ❌ No se activó ningún `coming_soon` sin kickoff route
- ❌ No se tocaron las 90 rutas legacy (ya responden 410)
- ❌ No se clonaron hubs GHL mock

---

## Pasos manuales del usuario — deploy en Railway

### Requisito previo: código en origin/main

```bash
git push origin main
```

El CI `.github/workflows/staging-smoke-p0.yml` se lanza automáticamente en push a main.

---

### 1. Variables de entorno en Railway

En Railway → proyecto → tu servicio → **Variables**, añadir todas estas:

#### Obligatorias (sin estas el servicio no arranca en condiciones)

| Variable | Cómo generarla | Notas |
|---|---|---|
| `DATABASE_URL` | Railway Postgres → Variables → copiar DATABASE_URL | Auto-inyectada si el servicio está vinculado al plugin Postgres |
| `JWT_SECRET` | `openssl rand -hex 32` | Mínimo 32 chars |
| `TRACKING_SECRET` | `openssl rand -hex 32` | HMAC open/click. Si ausente usa JWT_SECRET |
| `NEXTAUTH_SECRET` | `openssl rand -hex 32` | |
| `NEXTAUTH_URL` | `https://app.nelvyon.com` | URL canónica del deploy |
| `NEXT_PUBLIC_APP_URL` | `https://app.nelvyon.com` | Afecta URLs de tracking pixel — sin trailing slash |
| `CRON_SECRET` | `openssl rand -hex 32` | Header para proteger endpoint cron |

#### Email (SES)

| Variable | Valor | Notas |
|---|---|---|
| `SES_REGION` | `eu-west-1` | o la región donde verificaste el dominio |
| `SES_ACCESS_KEY_ID` | IAM key | Usuario IAM con permiso `ses:SendEmail` |
| `SES_SECRET_ACCESS_KEY` | IAM secret | |
| `SES_FROM_EMAIL` | `hola@nelvyon.com` | Dirección verificada en SES |

> Sin estas variables, los envíos de email fallan y la UI muestra un banner de advertencia (no crash).

#### Stripe (billing)

| Variable | Valor |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (del endpoint de prod en Stripe Dashboard) |
| `STRIPE_PRICE_ID_STARTER` | `price_...` |
| `STRIPE_PRICE_ID_PRO` | `price_...` |
| `STRIPE_PRICE_ID_AGENCY` | `price_...` |

#### Opcionales (AI/Voice)

| Variable | Cuándo |
|---|---|
| `OPENAI_API_KEY` | Si activas agentes GPT |
| `ANTHROPIC_API_KEY` | Si activas agentes Claude |
| `ELEVENLABS_API_KEY` | Para dialer/voice |

---

### 2. Migraciones de base de datos

Ejecutar **antes del primer deploy** (y tras cada release con migraciones nuevas):

```bash
# Desde Railway Shell (servicio → Connect → Shell):
psql $DATABASE_URL -f backend/db/migrations/001_init.sql
# ... repetir hasta:
psql $DATABASE_URL -f backend/db/migrations/400_nelvyon_pack_runs.sql
```

La migración máxima del repo es `400_nelvyon_pack_runs.sql`. **No crear 401–416 sin nueva feature.**

Alternativa — script automatizado:
```bash
node scripts/run-migrations.js
```

---

### 3. Build y deploy en Railway

1. Railway detecta el `package.json` en raíz y ejecuta `pnpm build`
2. Verifica que el build script en `apps/web/package.json` existe: `"build": "next build"`
3. Start command: `pnpm -C apps/web start` (o el que Railway auto-detecte)
4. Health check path: `/api/health` → debe responder `{ ok: true }`

---

### 4. Cron jobs

Railway no tiene scheduler nativo. Opciones:

**Opción A — Railway Cron Service (recomendada)**

1. Railway → proyecto → **New Service → Empty Service**
2. Name: `nelvyon-cron`
3. Start command:
   ```bash
   while true; do
     curl -s -X GET \
       -H "x-cron-secret: $CRON_SECRET" \
       "$NEXT_PUBLIC_APP_URL/api/cron/saas-workflows"
     sleep 300
   done
   ```
4. Variables: `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`

**Opción B — GitHub Actions** (ver `docs/RAILWAY_DEPLOY_CHECKLIST.md` § 2)

---

### 5. AWS SNS → SES bounces/complaints

```
POST https://app.nelvyon.com/api/webhooks/ses
```

1. SES → Configuration Sets → crear `nelvyon-prod`
2. SNS → Topics → Create topic Standard → `nelvyon-ses-notifications`
3. SNS → Topic → Create subscription HTTPS → endpoint arriba
4. SES → Configuration Set → Event destinations → SNS → events: Bounce, Complaint, Delivery
5. Verificar en logs de Railway: `"SNS SubscriptionConfirmation confirmed"`

---

### 6. Stripe webhook

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://app.nelvyon.com/api/webhooks/stripe`
3. Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copiar **Signing secret** → `STRIPE_WEBHOOK_SECRET` en Railway

---

### 7. Verificación post-deploy (smokes manuales)

```bash
# P0 smokes automáticos (requieren staging con credenciales QA):
node scripts/run-staging-p0-smokes.mjs --skip-wait

# Checks rápidos manuales:
curl -s https://app.nelvyon.com/api/health
# → { "ok": true }

curl -s -o /dev/null -w "%{http_code}" https://app.nelvyon.com/api/saas/analytics -H "Cookie: "
# → 401

# Legacy 410:
curl -s -o /dev/null -w "%{http_code}" https://app.nelvyon.com/api/legacy/saas/contacts
# → 410
```

Verificar en browser:
- `/saas/dashboard` → fondo `#020817` oscuro (dark glass)
- `/saas/campanias` → si SES_FROM_EMAIL no está: banner amber visible
- `/saas/billing` → badge del plan correcto tras simular webhook Stripe

---

---

## Post-perfección — Script de prueba producción (10 pasos)

Ejecutar estos 10 pasos **después del deploy** para confirmar que todo funciona en prod real.

```bash
PROD="https://app.nelvyon.com"

# 1. Health check
curl -sf "$PROD/api/health" | grep '"ok":true' && echo "✅ 1/10 health" || echo "❌ 1/10 health"

# 2. Auth protegida (401 sin cookie)
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD/api/saas/analytics")
[ "$CODE" = "401" ] && echo "✅ 2/10 auth gate" || echo "❌ 2/10 auth gate (got $CODE)"

# 3. Stripe price env configuradas (price-audit)
curl -sf "$PROD/api/billing/price-audit" | grep '"allValid":true' && echo "✅ 3/10 stripe prices" || echo "⚠️  3/10 stripe prices (revisar STRIPE_PRICE_ID_*)"

# 4. SES configurado (campanias API)
SES=$(curl -sf -H "Cookie: " "$PROD/api/saas/campanias" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ses_configured','?'))" 2>/dev/null || echo "?")
[ "$SES" = "True" ] || [ "$SES" = "true" ] && echo "✅ 4/10 SES configured" || echo "⚠️  4/10 SES not configured (banner visible en UI)"

# 5. CRM redirige legacy /crm → /saas/crm
CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "$PROD/crm")
[ "$CODE" = "200" ] && echo "✅ 5/10 /crm redirect" || echo "⚠️  5/10 /crm redirect (got $CODE)"

# 6. Pack kickoff responde (sin auth → 401)
for PACK in local-business-growth ecommerce-growth saas-b2b-growth; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD/api/os/packs/$PACK/kickoff")
  [ "$CODE" = "401" ] && echo "✅ 6/10 kickoff $PACK" || echo "❌ 6/10 kickoff $PACK (got $CODE, expected 401)"
done

# 7. Portal deliverables sin auth → 401
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD/api/platform/portal/deliverables")
[ "$CODE" = "401" ] || [ "$CODE" = "403" ] && echo "✅ 7/10 portal auth" || echo "❌ 7/10 portal auth (got $CODE)"

# 8. Cron endpoint protegido (sin secret → 401/403)
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD/api/cron/saas-workflows")
[ "$CODE" = "401" ] || [ "$CODE" = "403" ] && echo "✅ 8/10 cron protected" || echo "⚠️  8/10 cron not protected (got $CODE)"

# 9. Stripe webhook endpoint existe
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD/api/webhooks/stripe")
[ "$CODE" != "404" ] && echo "✅ 9/10 stripe webhook" || echo "❌ 9/10 stripe webhook 404"

# 10. SES webhook endpoint existe
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD/api/webhooks/ses")
[ "$CODE" != "404" ] && echo "✅ 10/10 ses webhook" || echo "❌ 10/10 ses webhook 404"

echo ""
echo "Manual browser checks:"
echo "  /saas/dashboard     → fondo #020817 oscuro"
echo "  /saas/campanias     → sin SES: banner amber visible"
echo "  /saas/billing       → plan badge correcto"
echo "  /portal             → panel cliente carga"
```

> Credenciales QA para smokes E2E completos: ver `docs/STAGING_P0_SMOKES.md`

---

## Qué NO hace el código (responsabilidad del usuario)

| Tarea | Por qué manual |
|---|---|
| Comprar dominio / configurar DNS | Registrador externo |
| Verificar dominio en AWS SES | Consola AWS |
| Crear cuenta Stripe y precios | Stripe Dashboard |
| Crear proyecto en Railway | Railway Dashboard |
| Configurar variables en Railway | Credenciales secretas |
| Ejecutar migraciones en prod | Acceso a DB de producción |
| Aprobar el primer deploy | Revisión humana final |
| Configurar SPF/DKIM en DNS | Registrador + SES |
