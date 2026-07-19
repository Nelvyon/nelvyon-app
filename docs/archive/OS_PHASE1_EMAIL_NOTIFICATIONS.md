# OS Phase 1 — Notificaciones email

## Proveedor

| Campo | Valor |
|-------|-------|
| **Proveedor** | [SendGrid](https://sendgrid.com/) |
| **Integración** | `backend/services/email_service.py` |
| **Variables** | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME` |
| **Orquestador OS** | `backend/services/os_notification_service.py` |

Sin `SENDGRID_API_KEY`: el email se encola en `email_queue` con status `no_api_key`; **no bloquea** la operación OS.

## Eventos

| Evento | Trigger | `email_type` | Destinatarios |
|--------|---------|--------------|---------------|
| Invitación portal | `PortalAuthService.create_invite` | `os_portal_invite` | Email invitado |
| Entregable publicado | `OsDeliverablesService.publish` | `os_deliverable_published` | Portal users + `contact_email` |
| Revisión solicitada | `PortalDeliverableReviewService.reject` | `os_deliverable_revision_requested` | Portal users + contacto |
| Nueva revisión interna | `OsDeliverablesService.create_revision` | `os_deliverable_revision_started` | Portal users + contacto |

## Enlaces en emails

Base URL: `FRONTEND_APP_URL` (fallback `NEXT_PUBLIC_APP_URL` o `https://nelvyon.com`).

- Invite: `/client/accept-invite?token=...`
- Portal: `/portal/deliverables`

## Tests

`backend/tests/test_os_notifications.py` — mocks de `notify_*` en invite, publish, reject.

## Prod checklist

1. `SENDGRID_API_KEY` válida en Railway (servicio API)
2. `SENDGRID_FROM_EMAIL` verificado en SendGrid
3. SPF/DKIM del dominio remitente
4. `FRONTEND_APP_URL` = dominio portal real
