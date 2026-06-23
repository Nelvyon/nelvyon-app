# Railway Deploy Checklist — Nelvyon SaaS

> Última actualización: 2026-06-23  
> Entorno objetivo: Railway (Node 20 + Postgres 16)

---

## 1. Variables de entorno requeridas

### Core / Auth
| Variable | Ejemplo | Notas |
|---|---|---|
| `JWT_SECRET` | `openssl rand -hex 32` | Mínimo 32 chars. También fallback de TRACKING_SECRET |
| `NEXTAUTH_SECRET` | `openssl rand -hex 32` | Para next-auth si se usa |
| `NEXTAUTH_URL` | `https://app.nelvyon.com` | URL canónica del deploy |
| `NEXT_PUBLIC_APP_URL` | `https://app.nelvyon.com` | Usado para tracking pixel URLs |

### Database
| Variable | Ejemplo | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/nelvyon` | Railway Postgres → Variables → DATABASE_URL |

### AWS SES (email real)
> Nombres exactos que usa el código en `backend/email/sesClient.ts` y `emailService.ts`

| Variable | Ejemplo | Notas |
|---|---|---|
| `SES_REGION` | `eu-west-1` | Región donde SES está verificado (`sesClient.ts` → `process.env.SES_REGION`) |
| `SES_ACCESS_KEY_ID` | `AKIA...` | IAM user con permiso `ses:SendEmail` (fallback: `AWS_SES_ACCESS_KEY`) |
| `SES_SECRET_ACCESS_KEY` | `...` | Secreto del IAM user (fallback: `AWS_SES_SECRET_KEY`) |
| `SES_FROM_EMAIL` | `hola@nelvyon.com` | Email verificado en SES — `emailService.ts` → `process.env.SES_FROM_EMAIL` |

> **Nota:** `AWS_ACCESS_KEY_ID` / `AWS_REGION` son los nombres estándar del SDK de AWS pero el código los ignora — usa los `SES_*` prefijados arriba. No confundir.

### Email tracking
| Variable | Ejemplo | Notas |
|---|---|---|
| `TRACKING_SECRET` | `openssl rand -hex 32` | HMAC secret para open/click tokens. Si ausente usa JWT_SECRET |

### Stripe (billing)
| Variable | Ejemplo | Notas |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Clave secreta Stripe producción |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Secret del webhook Stripe (billing events) |
| `STRIPE_STARTER_PRICE_ID` | `price_...` | Price ID plan Starter en Stripe |
| `STRIPE_PRO_PRICE_ID` | `price_...` | Price ID plan Pro |
| `STRIPE_AGENCY_PRICE_ID` | `price_...` | Price ID plan Agency |

### Cron jobs
| Variable | Ejemplo | Notas |
|---|---|---|
| `CRON_SECRET` | `openssl rand -hex 32` | Header `x-cron-secret` para proteger el endpoint cron |

### SNS Webhook (SES bounce/complaint)
| Variable | Ejemplo | Notas |
|---|---|---|
| `SKIP_SNS_VERIFY` | *(no definir en prod)* | Solo `true` en tests. En prod omitir = validación RSA activa |

### AI / Agents (opcionales según módulos activos)
| Variable | Notas |
|---|---|
| `OPENAI_API_KEY` | Si se usa GPT para agentes |
| `ANTHROPIC_API_KEY` | Si se usa Claude para agentes |
| `ELEVENLABS_API_KEY` | Para voice/dialer |

---

## 2. Cron jobs en Railway

Railway no tiene scheduler nativo. Opciones:

### Opción A — Railway Cron Service (recomendada)
1. En Railway → proyecto → **New Service → Empty Service**
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
4. Env vars: `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`
5. Interval recomendado: cada 5 minutos (300 s)

### Opción B — GitHub Actions scheduled workflow
```yaml
# .github/workflows/cron-workflows.yml
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X GET \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.APP_URL }}/api/cron/saas-workflows"
```

---

## 3. AWS SNS → SES webhook

Configura SNS para enviar notificaciones bounce/complaint/delivery al endpoint:

```
POST https://app.nelvyon.com/api/webhooks/ses
```

### Pasos en AWS Console

1. **SES → Configuraciones → Configuration Sets** → crear set `nelvyon-prod`
2. **SNS → Topics → Create topic**
   - Type: Standard
   - Name: `nelvyon-ses-notifications`
3. **SNS → Topic → Create subscription**
   - Protocol: **HTTPS**
   - Endpoint: `https://app.nelvyon.com/api/webhooks/ses`
   - El endpoint auto-confirma al recibir `SubscriptionConfirmation`
4. **SES → Configuration Set → Event destinations → Add destination**
   - Events: `Bounce`, `Complaint`, `Delivery`
   - Destination type: SNS
   - Topic: `nelvyon-ses-notifications`
5. En `SaasCampaniasService.ts`, el método `sendCampania` ya incluye:
   ```
   ConfigurationSetName: "nelvyon-prod"
   ```
   (verificar que coincide con el nombre del configuration set)

### Verificar que funciona
```bash
# Después del deploy, mirar logs del Railway service para:
# "SNS SubscriptionConfirmation confirmed"
```

---

## 4. Health check endpoint

Railway health check → `/api/health` (devuelve `{ ok: true }`).

Si no existe, crear:
```typescript
// apps/web/src/app/api/health/route.ts
export function GET() {
  return Response.json({ ok: true });
}
```

Configura en Railway → Service → Settings → Health Check Path: `/api/health`

---

## 5. Migraciones de base de datos

El repo tiene migraciones en `backend/db/migrations/`. Ejecutar en orden antes del primer deploy (y tras cada release con nuevas migraciones):

```bash
# En Railway → Service → Custom start command (o script separado):
node scripts/run-migrations.js && node server.js
```

O manualmente desde Railway shell:
```bash
psql $DATABASE_URL -f backend/db/migrations/001_init.sql
# ... hasta la última migración disponible
```

La migración máxima actual del repo es `400_nelvyon_pack_runs.sql`.

---

## 6. Checklist pre-deploy

- [ ] `DATABASE_URL` apunta a Railway Postgres
- [ ] `JWT_SECRET` y `TRACKING_SECRET` generados (≥ 32 chars)
- [ ] `AWS_*` vars configuradas y dominio verificado en SES
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` de producción
- [ ] `CRON_SECRET` generado y configurado en cron service
- [ ] SNS topic creado y subscription confirmada
- [ ] `NEXT_PUBLIC_APP_URL` = URL real de producción (afecta tracking pixels)
- [ ] Migraciones ejecutadas
- [ ] Health check respondiendo `200 { ok: true }`
- [ ] Primer envío de campaña de prueba → verificar open pixel cargado en SES logs

---

## 7. Troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---|---|---|
| Pixel open no registra | `NEXT_PUBLIC_APP_URL` incorrecto | Verificar que la URL no tiene trailing slash |
| Bounce no actualiza DB | SNS subscription no confirmada | Ver logs del webhook `/api/webhooks/ses` |
| Cron workflows no dispara | `CRON_SECRET` no coincide | Comparar env var con header enviado |
| Stripe webhook 400 | `STRIPE_WEBHOOK_SECRET` de staging en prod | Usar el secret del endpoint de producción en Stripe Dashboard |
| Email llega a spam | Dominio no verificado en SES / SPF/DKIM faltante | Configurar DNS records que SES indica |
