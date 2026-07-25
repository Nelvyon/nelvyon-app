# CEO — Canary productivo IA propia (Private AI)

> **Estado: `PENDING_CEO`.** Este documento **no aprueba** ni **activa** nada.  
> Staging ya aprobado por separado: `docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md` (Router+QR, staging only).  
> Código: `backend/agency/PrivateAiCanaryPrep.ts` → `isProductionCanaryAuthorized()` = **siempre `false`** (sin env que lo cambie).  
> Actualizado: **2026-07-25** · tip gate ADR-064 **`c2edb2da`** · prod IA keys **ABSENT** · OpenAI OFF.

## Decisión que se pide

Autorizar (o no) un **futuro** canary productivo de IA propia vía Ollama local — **0€** (sin OpenAI).

| Pedido | Respuesta esperada |
|--------|--------------------|
| ¿Autorizas canary prod IA propia? | **SÍ / NO** (escrito) |
| ¿Activar algo hoy? | **NO** — este doc no cambia flags |

## Condiciones mínimas (si SÍ)

1. Un tenant interno · un flujo de bajo riesgo · ventana acotada · checkpoint diario.
2. Flag de producción **nuevo** (hoy no existe) + cambio **manual** de `isProductionCanaryAuthorized()` — nunca por env.
3. Checklist 12 ítems en `PrivateAiCanaryPrep.ts` en verde + mesh Tailscale verificado en vivo.
4. Kill switch listo: `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1` + `NELVYON_AI_ENABLED=0`.

## Queda OFF sin excepción

- OpenAI / APIs de pago · `NELVYON_AI_ENABLED` en prod · MCP/SM/OpenClaw productivo · partner payouts · campañas masivas · Pepito · migraciones prod sin ADR-064 approval

## Rollback inmediato

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_AI_ENABLED=0
```

## Firma

| Rol | Decisión | Fecha | Firma |
|-----|----------|-------|-------|
| CEO | SÍ / NO / diferir | ____-__-__ | ________ |

Hasta firma SÍ + cambio de código: prod IA **ABSENT/OFF** · staging solo bajo alcance ya aprobado.  
**claimReady permanece false.**
