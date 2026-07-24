# Dossier — confirmación de uso comercial de "Datos Pepito"

> Este documento es lo que Daniel debe enviar a Datos Pepito (o a un abogado/asesoría) para
> obtener una **confirmación por escrito** antes de que NELVYON pueda plantearse usar esa base
> de datos para cualquier campaña. **Hasta que exista esa confirmación por escrito, Pepito
> permanece prohibido en código, sin excepción** (`pepitoDbForbidden: true`, hardcoded, en
> `backend/agency/CampaignsLegalTechnicalGate.ts`).
>
> Este dossier no aprueba nada por sí mismo — es la plantilla de la pregunta que hay que hacer.

## 1. Qué es "Datos Pepito" (contexto para quien lo reciba)

"Datos Pepito" es una base de datos **privada**, propiedad de Daniel / NELVYON, usada
únicamente para uso interno hasta la fecha. No es un servicio público, no es un dataset con
licencia comercial conocida, y no ha sido evaluada legalmente para uso en campañas de
marketing hacia terceros.

## 2. Qué necesitamos que se confirme por escrito

Antes de considerar usar Datos Pepito para cualquier campaña de email/mensajería:

1. **Origen y consentimiento**: ¿de dónde proceden los contactos/datos? ¿existe base legal
   (consentimiento explícito, interés legítimo documentado, u otra base RGPD/LOPDGDD válida)
   para usarlos en comunicaciones comerciales?
2. **Titularidad y licencia**: ¿quién es el titular legal de los datos? ¿existe algún acuerdo,
   licencia o cesión que autorice su uso comercial por parte de NELVYON?
3. **Alcance de uso permitido**: si existiera autorización, ¿para qué tipo de comunicaciones
   (email, SMS, llamadas), con qué frecuencia, y con qué mecanismo de baja obligatorio?
4. **Confirmación de cumplimiento normativo**: ¿un abogado/asesoría ha revisado el cumplimiento
   con RGPD / LSSI-CE (España) y, si aplica, CAN-SPAM u otras normativas del mercado objetivo?
5. **Vigencia y revocación**: ¿la autorización tiene fecha de caducidad o puede revocarse? ¿qué
   pasa con los datos ya usados si se revoca?

## 3. Compromiso de NELVYON mientras no exista esa confirmación

- **No** se importa, copia, ni sube Datos Pepito a ningún servicio externo (SES, CRM, proveedor
  de IA, proveedor de terceros) bajo ninguna circunstancia.
- **No** se usa Datos Pepito como origen de ninguna campaña, prueba, ni demo — ni siquiera en
  staging con datos "de verdad" (solo se usan datos sintéticos en staging, ver
  `backend/agency/StagingSharedMemoryMcpHarness.ts` como ejemplo del patrón que seguimos).
- El bloqueo (`pepitoDbForbidden: true`) es código, no una promesa verbal: cualquier intento de
  marcar `pepitoDbReferenced: true` en `evaluateCampaignsLegalTechnicalReadiness()` fuerza
  `technicalComplete: false` y `sendAuthorized: false` de forma incondicional.

## 4. Bloqueos técnicos actuales (referencia de código)

| Control | Estado | Dónde |
|---------|--------|-------|
| Pepito forzado a bloquear envío | ✅ Activo, permanente | `CampaignsLegalTechnicalGate.ts` → `pepitoDbForbidden: true` |
| `claimReadyLegal` | `false` hardcoded, no editable en runtime | `CampaignsLegalTechnicalGate.ts` |
| Origen/consentimiento verificable | Requiere `sourceTraceImplemented` + `consentFieldsImplemented` en `true` con evidencia real, no solo el flag | `CampaignsLegalTechnicalGate.ts` |
| Envío real | Bloqueado hasta `sendAuthorized: true` (técnico + CEO) **y** confirmación legal fuera de código | Checklist técnico-legal, `CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md` |

## Próximo paso EXACTO

1. Daniel envía las 5 preguntas de la sección 2 a Datos Pepito (o a su abogado) y espera
   respuesta por escrito.
2. Si la respuesta confirma origen legal + licencia de uso comercial + revisión de cumplimiento:
   se abre una tarea de código explícita, revisada por un humano, para evaluar activar Pepito
   como fuente — **nunca automáticamente por este documento**.
3. Si no hay confirmación o la respuesta es negativa/ambigua: Pepito sigue prohibido
   indefinidamente, sin fecha límite.
