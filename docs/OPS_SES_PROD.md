# OPS — SES producción (checklist humana mínima)

Código: `sesClient`, bounce/complaint webhooks con **tenant_id** obligatorio en fallbacks, health env-only.

## Estado 2026-07-21

**KI-014 cerrado.** AWS SES `ProductionAccessEnabled: true` · Review **GRANTED** · `SendingEnabled: true`.  
Dominio `nelvyon.com` Verification/DKIM **SUCCESS**. Self-send From=To SES_FROM **OK**.  
SNS topic `nelvyon-ses-events` → `https://nelvyon.com/api/webhooks/ses` (PendingConfirmation=false).

## Variables

```
SES_ACCESS_KEY_ID=
SES_SECRET_ACCESS_KEY=
SES_REGION=eu-west-1
SES_FROM_EMAIL=
SES_FROM_NAME=NELVYON
```

## Acciones humanas residuales (opcionales)

1. Primer envío a destinatario externo real (campaña) → verificar open/bounce en logs.
2. Health UI: `ses_configured` cuando keys + from presentes.
3. Mantener DKIM/SPF/DMARC en Cloudflare.

## In-repo (ya cerrado)

- Fallbacks bounce/complaint **scoped por tenant_id**
- `isSesEnvConfigured` / `missingSesEnvKeys`
- Apelación histórica: `docs/SES_PRODUCTION_ACCESS_APPEAL.md` (obsoleta como bloqueo)
