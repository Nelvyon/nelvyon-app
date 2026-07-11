# Amazon SES — Producción (Fase 1)

> **Región:** `eu-west-1` · **Dominio:** `nelvyon.com` · **Webhook:** `https://nelvyon.com/api/webhooks/ses`  
> **Auditoría:** `node scripts/audit-ses-production.mjs`

---

## Estado actual (CLI 2026-07-11)

| Componente | Estado | Evidencia |
|------------|--------|-----------|
| Identidad dominio | ✅ `SUCCESS` | `VerifiedForSendingStatus: true` |
| DKIM | ✅ `SUCCESS` | 3 CNAME `_domainkey` en Cloudflare (DNS only) |
| Production access | ❌ `DENIED` | CaseId `178372013800016` — apelación: `docs/SES_PRODUCTION_ACCESS_APPEAL.md` |
| EnforcementStatus | ✅ `HEALTHY` | `get-account` |
| SNS topic | ✅ | `arn:aws:sns:eu-west-1:354780327276:nelvyon-ses-events` |
| SNS → webhook | ✅ | Suscripción HTTPS **confirmada** (auto vía `/api/webhooks/ses`) |
| Configuration set | ✅ | `nelvyon-prod` + eventos BOUNCE/COMPLAINT/DELIVERY → SNS |
| Identity topics | ✅ | Bounce + Complaint → SNS |
| Notification headers | ✅ | Bounce/Complaint/Delivery headers en payloads SNS |
| Suppression list | ✅ | BOUNCE + COMPLAINT a nivel cuenta |
| MAIL FROM custom | — | No configurado (usa default SES) |

---

## 1. Verificación dominio (Cloudflare — acción manual obligatoria)

**Causa raíz:** AWS resuelve `_amazonses.nelvyon.com` → **NXDOMAIN**. Solo existe TXT Google en apex.

### Opción A — Script automático

```bash
# Token: Cloudflare → My Profile → API Tokens → Edit zone DNS
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ZONE_ID=...   # opcional — se auto-resuelve
node scripts/apply-ses-dns-cloudflare.mjs
```

### Opción B — Cloudflare Dashboard manual

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **nelvyon.com** → **DNS** → **Add record**
2. Crear **4 registros** (Proxy status: **DNS only** / grey cloud):

| Type | Name | Content |
|------|------|---------|
| TXT | `_amazonses` | *(token actual — ejecutar `node scripts/apply-ses-dns-cloudflare.mjs --dry-run` y copiar del JSON; no commitear)* |
| CNAME | `ualcozel6djfzgxb2fpoubv6gwlgsves._domainkey` | `ualcozel6djfzgxb2fpoubv6gwlgsves.dkim.amazonses.com` |
| CNAME | `kzb2nrst7evqzwyozpk36inbrhii4lco._domainkey` | `kzb2nrst7evqzwyozpk36inbrhii4lco.dkim.amazonses.com` |
| CNAME | `l3tvydzdbz5u2fm7tcyh7aaczicz4fgf._domainkey` | `l3tvydzdbz5u2fm7tcyh7aaczicz4fgf.dkim.amazonses.com` |

3. Verificar propagación:

```bash
nslookup -type=TXT _amazonses.nelvyon.com
aws sesv2 get-email-identity --email-identity nelvyon.com --region eu-west-1 \
  --query "{Verification:VerificationStatus,Dkim:DkimAttributes.Status}"
```

Esperado: `SUCCESS` en ambos (5–30 min tras DNS).

---

## 2. Production Access (acción manual obligatoria — DENIED)

CLI envió solicitud vía `put-account-details` **antes** de verificar dominio/DKIM. AWS respondió **`ReviewDetails.Status: DENIED`**.

**Apelación completa:** `docs/SES_PRODUCTION_ACCESS_APPEAL.md` (texto EN listo para copiar, pasos CEO, CLI post-aprobación).

### Pasos consola (resumen)

1. [SES Account dashboard eu-west-1](https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/account) → **Request production access** o [Support case 178372013800016](https://console.aws.amazon.com/support/home#/case/?displayId=178372013800016&language=en) → Reply.
2. Pegar texto de apelación (inglés) del doc §3.
3. Tras aprobación: `aws sesv2 get-account --region eu-west-1 --query ProductionAccessEnabled` → `true`.

---

## 3. SNS (COMPLETADO vía CLI)

Ejecutado automáticamente:

```bash
aws sns create-topic --name nelvyon-ses-events --region eu-west-1
aws sns subscribe --topic-arn ... --protocol https \
  --notification-endpoint https://nelvyon.com/api/webhooks/ses
aws sesv2 create-configuration-set --configuration-set-name nelvyon-prod
aws sesv2 create-configuration-set-event-destination ...  # BOUNCE, COMPLAINT, DELIVERY
aws sesv2 put-email-identity-configuration-set-attributes --email-identity nelvyon.com \
  --configuration-set-name nelvyon-prod
aws ses set-identity-notification-topic --identity nelvyon.com --notification-type Bounce ...
aws ses set-identity-notification-topic --identity nelvyon.com --notification-type Complaint ...
```

La app confirma suscripciones SNS automáticamente (`SubscriptionConfirmation` → fetch `SubscribeURL`).

Verificar:

```bash
aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:eu-west-1:354780327276:nelvyon-ses-events
node scripts/audit-ses-production.mjs
```

---

## 4. Railway (ya configurado)

| Variable | Valor |
|----------|-------|
| `SES_REGION` | `eu-west-1` |
| `SES_ACCESS_KEY_ID` | IAM user `nelvyon-cli` |
| `SES_SECRET_ACCESS_KEY` | *(Railway)* |
| `SES_FROM_EMAIL` | `no-reply@nelvyon.com` |

Opcional futuro: `SES_CONFIGURATION_SET=nelvyon-prod` en sends (delivery events vía config set).

---

## 5. Checklist cierre Fase 1 SES

- [x] DNS Cloudflare (4 registros) → dominio **Verified** (2026-07-11)
- [x] DKIM **Success**
- [ ] Production access **Approved** (appeal caso DENIED — `SES_PRODUCTION_ACCESS_APPEAL.md`)
- [x] SNS topic + webhook confirmado
- [x] Bounce/complaint → SNS
- [ ] Production access **Approved** (CEO appeal)
- [ ] Primer email test post-aprobación

---

## Scripts

| Script | Uso |
|--------|-----|
| `scripts/apply-ses-dns-cloudflare.mjs` | Aplicar DNS SES en Cloudflare |
| `scripts/audit-ses-production.mjs` | Auditoría CLI completa |
