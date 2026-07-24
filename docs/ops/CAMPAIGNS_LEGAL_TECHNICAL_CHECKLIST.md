# Checklist técnico-legal — Campañas de email/mensajería masiva

> **`claimReadyLegal`: SIEMPRE `false`.** No es un flag de entorno ni un parámetro de función —
> solo puede cambiar mediante una actualización manual de código después de que exista una
> **licencia comercial escrita** y una **confirmación de revisión legal** reales. Este documento
> y `backend/agency/CampaignsLegalTechnicalGate.ts` son la fuente de verdad de por qué sigue
> bloqueado.
>
> Fuente de verdad en código: `evaluateCampaignsLegalTechnicalReadiness()` en
> `backend/agency/CampaignsLegalTechnicalGate.ts`.
> Tests: `backend/agency/__tests__/CampaignsLegalTechnicalGate.test.ts`.

## Regla de oro

**Ningún envío masivo sale sin aprobación explícita de CEO + Legal**, incluso si el checklist
técnico está 100% completo. Lo técnico habilita; lo legal autoriza. Son gates independientes y
ambos deben estar en verde — el legal, además, nunca se marca en verde automáticamente por código.

## Checklist técnico (verificable en código, booleano)

| # | Ítem | Qué verifica | Dónde vive en código |
|---|------|--------------|-----------------------|
| 1 | `source_trace` | Cada mensaje enviado enlaza a su registro de origen/consentimiento (de dónde salió el contacto). | `sourceTraceImplemented` (input del caller — el caller debe probarlo con datos reales antes de marcarlo `true`) |
| 2 | `consent_fields` | Existen y se aplican campos de opt-in/consentimiento antes de cualquier envío. | `consentFieldsImplemented` |
| 3 | `unsubscribe` | Baja de un clic + header `List-Unsubscribe` implementados y probados. | `unsubscribeImplemented` |
| 4 | `ses_configured` | Presencia de configuración SES real (no valores) — booleano derivado de env. | `isSesEnvConfigured()` en `backend/saas/saasEnv.ts` (reutilizado, no duplicado) |
| 5 | `pepito_db_forbidden` | La base de datos demo/scrapeada "Pepito" **nunca** puede ser origen de una campaña real. | `pepitoDbReferenced` debe ser `false`/ausente; si es `true`, bloquea y queda registrado como violación permanente |
| 6 | `ceo_legal_send_authorized` | Autorización explícita **por campaña** (nunca un flag global "siempre on") de CEO + Legal antes de cualquier envío real. | `ceoLegalSendAuthorized` |

`technicalComplete` es `true` únicamente cuando los ítems 1–4 y el ítem "Pepito limpio" son
verdaderos. El ítem 6 (autorización CEO+Legal) se evalúa por separado y **siempre** aparece como
bloqueador (`no_send_without_ceo_and_legal`) si falta, incluso con `technicalComplete: true`.

## Checklist legal (NO verificable en código — requiere confirmación humana)

| # | Ítem | Estado |
|---|------|--------|
| 1 | Licencia comercial escrita (contrato/ToS que autorice el envío de comunicaciones comerciales) | **BLOCKED** — pendiente |
| 2 | Confirmación de revisión legal (abogado/asesoría confirma cumplimiento GDPR/CAN-SPAM/LSSI-CE según jurisdicción) | **BLOCKED** — pendiente |

Mientras estos dos ítems no existan como confirmación humana documentada (fuera de este repo,
p. ej. en un contrato firmado), `claimReadyLegal` permanece `false` **sin excepción**, y el gate
siempre incluye:

```
blockers: [..., "legal_written_commercial_license_pending", "legal_review_confirmation_pending"]
```

## Por qué esto no es solo un flag

`claimReadyLegal` no se puede "activar" desde ningún input, variable de entorno o llamada a
función — el propio tipo de retorno lo tipa como literal `false`
(`claimReadyLegal: false` en `CampaignsLegalTechnicalResult`). Esto es intencional: evita que un
futuro cambio accidental (o un LLM ejecutando código) declare falsamente que el envío es legal.
El único camino para desbloquear es una edición de código explícita, revisada por un humano, el
día que exista evidencia real de licencia + revisión legal.

## Cómo verificar

```bash
pnpm -C apps/web exec vitest run backend/agency/__tests__/CampaignsLegalTechnicalGate.test.ts --reporter=dot
```

## Próximo paso EXACTO

1. Legal: obtener licencia comercial escrita para envíos masivos (fuera de este repo).
2. Legal: confirmar revisión de cumplimiento (GDPR/CAN-SPAM/LSSI-CE según mercado objetivo).
3. Solo entonces: actualizar manualmente `CampaignsLegalTechnicalGate.ts` bajo revisión humana
   explícita — nunca automatizar este cambio.
4. Hasta entonces: **cero envíos masivos reales**, con o sin `technicalComplete: true`.
