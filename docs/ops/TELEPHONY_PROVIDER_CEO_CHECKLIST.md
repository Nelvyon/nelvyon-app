# Checklist Daniel — Proveedor de telefonía (Twilio) real

> **2026-07-30** · SSOT Fase 2: `docs/ops/PHASE2_EXTERNAL_INTEGRATIONS.md`

## Estado actual (honesto) — dos capas

| Capa | Comportamiento |
|------|----------------|
| Agency `TelephonyCore` / `TwilioTelephonyProvider` | Constructor **siempre** `BLOCKED_EXTERNAL` — dialer OS 100% simulador |
| SaaS `SaasDialerService` / `SaasSmsService` | Si `TWILIO_*` está en Railway, **puede** llamar/SMS reales vía REST |

**No** cargar `TWILIO_*` en prod ni aprobar llamadas/SMS reales hasta completar esta tabla.

## Qué falta para telefonía real (humano)

| # | Qué | Qué hace falta de ti |
|---|-----|------------------------|
| 1 | **Cuenta Twilio** | Crear/activar cuenta Twilio de NELVYON con método de pago propio |
| 2 | **Números de teléfono** | Comprar el/los números (voz y/o SMS) |
| 3 | **A2P / regulación** | Registro caller ID / A2P según país |
| 4 | **Consentimiento legal** | Base legal para llamar/SMS (opt-in, DNC/Robinson) |
| 5 | **Grabación** | Decidir grabación + aviso legal |
| 6 | **Horarios** | Franjas legales por país |
| 7 | **Presupuesto** | Aprobar coste por minuto/SMS |
| 8 | **Railway secrets** | Pegar `TWILIO_ACCOUNT_SID` · `TWILIO_AUTH_TOKEN` · `TWILIO_FROM_NUMBER` (nunca en git) |
| 9 | **Primera prueba** | Una llamada/SMS a número propio con SÍ escrito |

## Variables

```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TWILIO_TWIML_URL=   # opcional
TWILIO_FROM_WHATSAPP=  # solo si usas WA vía Twilio (preferir Meta Cloud — WHATSAPP_CEO_CHECKLIST)
```

## Próximo paso EXACTO

1. Completar tabla 1–7.
2. Pegar secrets (8) solo tras SÍ.
3. Primera prueba (9) — sin bulk (`NELVYON_SMS_BULK_ENABLED=0`).
4. Agency `TwilioTelephonyProvider` sigue bloqueado hasta reescritura técnica + nuevo SÍ.
