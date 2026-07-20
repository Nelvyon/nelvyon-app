# OPS — SES producción (checklist humana mínima)

Código: `sesClient`, bounce/complaint webhooks con **tenant_id** obligatorio en fallbacks, health env-only.

## Bloqueo actual

**KI-014** — AWS SES `ProductionAccessEnabled: false` (DENIED). Ver `docs/SES_PRODUCTION_ACCESS_APPEAL.md`.

## Variables

```
SES_ACCESS_KEY_ID=
SES_SECRET_ACCESS_KEY=
SES_REGION=eu-west-1
SES_FROM_EMAIL=
SES_FROM_NAME=NELVYON
```

## Acciones humanas (exactas)

1. Completar apelación SES production access (documento appeal).
2. Tras aprobación AWS: verificar dominio + DKIM/SPF/DMARC (Cloudflare DNS).
3. Crear SNS topic → suscribir HTTPS `https://<host>/api/webhooks/ses` (bounce/complaint/delivery).
4. Confirmar suscripción SNS (URL de confirmación).
5. Enviar a 1 destinatario externo no sandbox → verificar open/bounce logs.
6. Health: UI campaña muestra `ses_configured` cuando keys + from presentes.

## In-repo (ya cerrado)

- Fallbacks bounce/complaint **scoped por tenant_id** (no update global por email)
- `isSesEnvConfigured` / `missingSesEnvKeys`
- `.env.example` con keys SES assignables
