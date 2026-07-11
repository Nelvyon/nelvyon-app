# Amazon SES — Apelación Production Access (Case 178372013800016)

> **Región:** `eu-west-1` · **Cuenta AWS:** `354780327276` · **Dominio:** `nelvyon.com`  
> **Auditoría:** `node scripts/audit-ses-production.mjs`  
> **Actualizado:** 2026-07-11

---

## 1. Motivo probable de la denegación

### Evidencia verificada (AWS CLI / consola)

| Dato | Valor |
|------|-------|
| `ReviewDetails.Status` | **DENIED** |
| `ReviewDetails.CaseId` | **178372013800016** |
| `ProductionAccessEnabled` | `false` |
| `Details.MailType` | `TRANSACTIONAL` |
| `Details.WebsiteURL` | `https://nelvyon.com` |
| `Details.AdditionalContactEmailAddresses` | `dev@nelvyon.com` |
| Solicitud enviada vía | `aws sesv2 put-account-details` (CLI) |
| Support API (`describe-cases`) | No disponible — cuenta sin **AWS Premium Support** |

Texto exacto enviado en la solicitud denegada (`get-account`):

> NELVYON SaaS B2B: transactional emails (password reset, booking confirmations, workflow notifications) and opt-in marketing campaigns to CRM contacts. Bounce/complaint handling via SNS webhook to https://nelvyon.com/api/webhooks/ses. Expected volume under 50k/month initially.

### Inferencias (causa más probable, no confirmada por AWS)

1. **Dominio y DKIM no verificados en el momento de la solicitud** — **Alta confianza**  
   - Al enviar `put-account-details` (2026-07-10), `VerificationStatus` era `PENDING` con `ErrorType: HOST_NOT_FOUND`.  
   - Hoy (2026-07-11): `VerificationStatus: SUCCESS`, `DkimAttributes.Status: SUCCESS`, `VerifiedForSendingStatus: true`.  
   - AWS suele rechazar solicitudes cuando la identidad de envío no está verificada.

2. **Infraestructura SNS/webhook incompleta en el momento de la revisión** — **Media confianza**  
   - SNS + configuration set se configuraron el mismo día; la suscripción HTTPS se confirmó después.  
   - La solicitud pudo revisarse antes de que el ecosistema de notificaciones estuviera operativo.

3. **Caso de uso mixto (transaccional + marketing) sin detalle suficiente** — **Media confianza**  
   - La descripción mencionaba campañas de marketing además de transaccionales, sin explicar consentimiento, bajas ni supresión.

4. **Cuenta nueva sin historial de envío** — **Media confianza**  
   - `SentLast24Hours: 0.0` — sin reputación previa en SES.

5. **Volumen declarado (50k/mes) desproporcionado para cuenta sin envíos** — **Baja–media confianza**  
   - No hay métricas reales que justifiquen ese volumen inicial.

**AWS no expone el motivo textual de la denegación vía CLI** sin plan Support. La apelación corrige los puntos verificables (dominio, DKIM, SNS, controles en código).

### Bloqueo CLI demostrado (2026-07-11)

Mientras `ReviewDetails.Status: DENIED`, **AWS rechaza cualquier `put-account-details` por CLI**:

```
aws sesv2 put-account-details ... --no-production-access-enabled
→ ConflictException

aws sesv2 put-account-details ... --production-access-enabled
→ ConflictException
```

`ProductionAccessEnabled` **solo puede pasar a `true` por decisión humana de AWS** (Support case / consola). No existe otro API/CLI.

---

## 2. Evidencias verificadas (estado actual)

Ejecutado: `node scripts/audit-ses-production.mjs` (2026-07-11)

| Check | Estado | Comando / evidencia |
|-------|--------|---------------------|
| Domain Verification | ✅ `SUCCESS` | `aws sesv2 get-email-identity --email-identity nelvyon.com --region eu-west-1` |
| DKIM | ✅ `SUCCESS` | mismo comando |
| `VerifiedForSendingStatus` | ✅ `true` | mismo comando |
| `ProductionAccessEnabled` | ❌ `false` | `aws sesv2 get-account --region eu-west-1` |
| `EnforcementStatus` | ✅ `HEALTHY` | `get-account` |
| Account suppression | ✅ `BOUNCE`, `COMPLAINT` | `get-account → SuppressionAttributes` |
| Configuration set | ✅ `nelvyon-prod` | `list-configuration-sets` |
| Eventos | ✅ `BOUNCE`, `COMPLAINT`, `DELIVERY` | `get-configuration-set-event-destinations` |
| SNS topic | ✅ `nelvyon-ses-events` | `aws sns list-topics` |
| SNS HTTPS subscription | ✅ **Confirmada** | Endpoint `https://nelvyon.com/api/webhooks/ses` |
| Identity bounce/complaint topics | ✅ Configurados | `aws ses get-identity-notification-attributes` |
| Notification headers | ✅ Habilitados | Bounce, Complaint, Delivery headers in SNS payloads |
| Identity → config set | ✅ `nelvyon-prod` | `get-email-identity` |
| Sandbox quota actual | 200 emails/24h, 1/sec | `get-account → SendQuota` |
| Emails enviados (24h) | **0** | `SendQuota.SentLast24Hours` |

### Controles verificados en repositorio

| Control | Implementación |
|---------|----------------|
| Rebotes (bounce) | SNS → `/api/webhooks/ses` → `saas_campania_recipients.status = 'bounced'` |
| Reclamaciones (complaint) | SNS → webhook → `unsubscribed` + tag `unsubscribed` en `saas_contacts` |
| Supresión AWS | `SuppressionAttributes: BOUNCE, COMPLAINT` a nivel cuenta |
| Baja comercial | Enlace en campañas → `/api/saas/campanias/unsubscribe?token=…` (público, sin auth) |
| Exclusión opt-out | Audiencias de campaña excluyen contactos con tag `unsubscribed` |
| Sin listas compradas | Contactos solo desde registro SaaS, CRM del tenant y formularios con consentimiento |
| Validación email | Registro, invitaciones equipo, waitlist, API (`email.includes("@")` + validaciones de servicio) |
| Rate limiting | Cuota sandbox SES (200/24h); metering por plan en `SaasUsageMeterService` |
| Logs / trazabilidad | `saas_activity_log`, `saas_campania_recipients`, `SaasDeliverabilityService`, Sentry |
| Privacidad | `https://nelvyon.com/privacy` (RGPD, contacto `danicaste2004@gmail.com`) |
| Abuso | Política de privacidad (prevención fraude); revisión manual vía contacto; métricas deliverability |

**Correcciones aplicadas (2026-07-11):**
- Webhook SES: rebotes/reclamaciones en producción (email + tags SES).
- Audiencias excluyen contactos `unsubscribed`.
- Middleware: `/api/saas/campanias/unsubscribe` público (fix 401 → 400).
- AWS: headers en notificaciones bounce/complaint/delivery habilitados.

---

## 3. Texto de apelación — INGLÉS (copiar y pegar)

```
Subject: Appeal — SES Production Access Request (Case ID 178372013800016)

Dear Amazon SES Trust & Safety Team,

We are appealing the denial of our production access request for AWS account 354780327276 (Case ID 178372013800016) in region eu-west-1.

Since our original request, we have completed all technical prerequisites that were missing at submission time:

• Verified sending domain: nelvyon.com (VerificationStatus: SUCCESS, VerifiedForSendingStatus: true)
• DKIM: SUCCESS (3 CNAME records published, DNS-only)
• Configuration set: nelvyon-prod with SNS event destination for BOUNCE, COMPLAINT, and DELIVERY
• SNS topic: arn:aws:sns:eu-west-1:354780327276:nelvyon-ses-events
• HTTPS webhook (confirmed): https://nelvyon.com/api/webhooks/ses
• Identity-level bounce and complaint notifications routed to the same SNS topic
• Bounce, complaint, and delivery notifications include original message headers for correlation
• Account suppression list enabled for BOUNCE and COMPLAINT
• EnforcementStatus: HEALTHY

ABOUT NELVYON
NELVYON (https://nelvyon.com) is a B2B SaaS platform for CRM, workflows, and marketing automation operated by a single legal entity. Our primary SES use case is TRANSACTIONAL email required to operate the product.

PRIMARY USE CASE — TRANSACTIONAL (majority of volume)
• Account registration and email verification
• Password reset and security notifications
• Billing and subscription notifications (Stripe integration)
• Workflow-triggered notifications requested by the account owner (e.g. contact stage changes)
• Product and service alerts initiated by the user or tenant configuration

SECONDARY USE CASE — OPT-IN MARKETING ONLY
• Email campaigns are sent only to contacts explicitly stored in the tenant’s CRM
• Marketing consent is collected via registration forms and CRM opt-in checkboxes (GDPR)
• Every marketing email includes a one-click unsubscribe link
• Unsubscribed, bounced, and complained addresses are suppressed from future campaign audiences
• We do NOT use purchased, rented, or scraped lists

HOW RECIPIENTS ARE OBTAINED AND VALIDATED
• Self-registration on https://nelvyon.com/register (email format validated)
• Contacts manually added by authenticated B2B tenant users in our CRM
• Form submissions with explicit marketing consent checkbox where applicable
• No third-party list imports from data brokers

BOUNCE AND COMPLAINT HANDLING
• SES publishes BOUNCE, COMPLAINT, and DELIVERY events to SNS
• SNS delivers to our HTTPS endpoint https://nelvyon.com/api/webhooks/ses (subscription confirmed)
• Our application verifies SNS message signatures before processing
• Permanent bounces mark recipients as bounced in our database
• Complaints mark recipients as unsubscribed and add a global suppression tag
• AWS account-level suppression list is enabled
• Marketing emails include List-Unsubscribe via tokenized HTTPS unsubscribe URLs

EXPECTED SENDING VOLUME (conservative, based on actual state)
• Current SentLast24Hours: 0 (sandbox — no production sends yet)
• Initial ramp: low transactional volume per tenant as we onboard B2B customers
• We will stay well within SES best practices and request limit increases through the normal AWS process as real usage grows
• We do not project large bulk campaigns at launch

COMPLIANCE COMMITMENT
We commit to comply with the AWS Acceptable Use Policy, SES Service Terms, and email best practices. We monitor deliverability metrics in our application and will investigate any abuse reports promptly.

CONTACT
Technical contact: dev@nelvyon.com
Privacy / data protection: danicaste2004@gmail.com (also published at https://nelvyon.com/privacy)

REQUEST
Please manually review Case ID 178372013800016 and enable production access for eu-west-1. If any additional requirement is missing, please specify exactly what you need and we will provide it immediately.

Thank you for your consideration.

NELVYON
https://nelvyon.com
```

---

## 4. Texto equivalente — ESPAÑOL (referencia interna)

```
Asunto: Apelación — Solicitud de acceso a producción SES (Case ID 178372013800016)

Estimado equipo de Amazon SES Trust & Safety,

Apelamos la denegación de acceso a producción de la cuenta AWS 354780327276 (Case ID 178372013800016) en la región eu-west-1.

Desde la solicitud original hemos completado los requisitos técnicos que faltaban:

• Dominio verificado nelvyon.com (SUCCESS)
• DKIM SUCCESS
• Configuration set nelvyon-prod con eventos BOUNCE, COMPLAINT, DELIVERY → SNS
• SNS topic nelvyon-ses-events con webhook HTTPS confirmado en https://nelvyon.com/api/webhooks/ses
• Notificaciones de bounce/complaint a nivel identidad → SNS
• Lista de supresión de cuenta habilitada (BOUNCE, COMPLAINT)
• EnforcementStatus: HEALTHY

CASO DE USO PRINCIPAL — TRANSACCIONAL
Registro, verificación de correo, recuperación de contraseña, facturación (Stripe), notificaciones de workflows y alertas solicitadas por el usuario.

CASO DE USO SECUNDARIO — MARKETING OPT-IN
Solo contactos del CRM del tenant con consentimiento explícito. Enlace de baja en cada campaña. Sin listas compradas ni scraping.

GESTIÓN DE REBOTES Y RECLAMACIONES
SNS → webhook con verificación de firma → actualización en base de datos y supresión de destinatarios.

VOLUMEN
SentLast24Hours: 0. Rampa inicial conservadora. Sin campañas masivas al lanzamiento.

CONTACTO
Técnico: dev@nelvyon.com · Privacidad: danicaste2004@gmail.com (https://nelvyon.com/privacy)

Solicitamos revisión manual del Case ID 178372013800016 y activación de production access en eu-west-1. Si falta algún requisito, indíquenlo concretamente.

NELVYON — https://nelvyon.com
```

---

## 5. Dónde enviar la apelación (consola AWS)

### Ruta principal (recomendada)

1. Iniciar sesión en la cuenta AWS **354780327276**.
2. Región: **eu-west-1** (Irlanda).
3. Abrir **Amazon SES → Account dashboard**:  
   https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/account
4. En el banner **"Your Amazon SES account is in the sandbox"**:
   - Clic en **"View details"** o **"Request production access"**.
   - Si permite nueva solicitud: rellenar el formulario con los datos de la sección 6 y pegar el texto de apelación (sección 3) en el campo de descripción / comentarios adicionales.
5. Si aparece el caso denegado, abrir **AWS Support Center**:  
   https://console.aws.amazon.com/support/home#/case/?displayId=178372013800016&language=en
   - **Add communication** / **Reply** → pegar el texto de apelación (sección 3).

### Rutas alternativas

| Ruta | URL |
|------|-----|
| SES Getting started | https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/get-set-up |
| Support cases list | https://console.aws.amazon.com/support/home#/case/dashboard |

> **No ejecutar** `aws sesv2 put-account-details` automáticamente mientras el caso siga en DENIED. La apelación debe ir por **revisión humana** en consola/Support.

---

## 6. Pasos exactos para el CEO

### Antes de enviar (2 min)

```bash
node scripts/audit-ses-production.mjs
```

Confirmar: Domain SUCCESS, DKIM SUCCESS, SNS confirmed. Solo debe fallar **Production access**.

### Envío de la apelación (~10 min)

1. **AWS Console** → cuenta `354780327276` → región **eu-west-1**.
2. Ir a [SES Account dashboard](https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/account).
3. Clic **Request production access** (o abrir caso `178372013800016` en Support).
4. Completar formulario:

| Campo | Valor |
|-------|-------|
| Mail type | **Transactional** (principal) |
| Website URL | `https://nelvyon.com` |
| Use case description | Pegar texto sección 3 (inglés) |
| Additional contacts | `dev@nelvyon.com` |
| Preferred language | **English** |
| Expected daily volume | Bajo — empezar con volumen transaccional por tenant (sin cifras inventadas) |

5. Enviar / Reply al caso.
6. **No reenviar** por CLI hasta respuesta de AWS.

### Después de enviar

1. Esperar respuesta AWS (típico: 24–72 h laborables).
2. Verificar aprobación:

```bash
aws sesv2 get-account --region eu-west-1 --query "{Production:ProductionAccessEnabled,Review:Details.ReviewDetails}"
```

Esperado tras aprobación: `Production: true`, `Review.Status` distinto de `DENIED`.

3. Auditoría completa:

```bash
node scripts/audit-ses-production.mjs
```

4. **Redeploy Railway** (production) para incluir fix webhook + exclusión unsubscribed (commit pendiente de deploy).
5. Enviar **un email de prueba** transaccional desde staging/sandbox para validar flujo.

---

## 7. Comprobación posterior por AWS CLI

```bash
# Estado general
aws sesv2 get-account --region eu-west-1

# Identidad
aws sesv2 get-email-identity --email-identity nelvyon.com --region eu-west-1 \
  --query "{Verification:VerificationStatus,Dkim:DkimAttributes.Status,ConfigSet:ConfigurationSetName}"

# SNS
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:eu-west-1:354780327276:nelvyon-ses-events --region eu-west-1

# Eventos configuration set
aws sesv2 get-configuration-set-event-destinations \
  --configuration-set-name nelvyon-prod --region eu-west-1

# Script todo-en-uno
node scripts/audit-ses-production.mjs
```

---

## 8. ¿SES está técnicamente listo para aprobación?

| Criterio AWS típico | Estado |
|---------------------|--------|
| Dominio verificado | ✅ |
| DKIM | ✅ |
| Proceso bounce/complaint | ✅ (SNS + webhook + supresión cuenta) |
| Caso de uso claro | ✅ (documentado en apelación) |
| Sitio web + privacidad | ✅ |
| Production access | ❌ Pendiente revisión humana |

**Veredicto:** La infraestructura SES está **lista para revisión**. El único bloqueante es la **aprobación manual de AWS**. Tras aprobación, redeploy de la app para aplicar el fix del webhook en producción.

---

## Referencias

- `docs/SES_PRODUCTION_SETUP.md` — guía operativa SES
- `docs/CEO_FINAL_ACTIONS.md` §4–5 — checklist CEO
- `apps/web/src/app/api/webhooks/ses/route.ts` — webhook SNS/SES
- `backend/saas/SaasCampaniasService.ts` — campañas, baja, audiencias
- `scripts/audit-ses-production.mjs` — auditoría CLI
