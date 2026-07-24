# Matriz de decisión — proveedores de generación visual (ADR-051 / ADR-055)

> Hoy no hay ningún proveedor de pago conectado. `NELVYON_VISUAL_GENERATION_ENABLED` está
> OFF y `getVisualGenerationProvider()` siempre devuelve `OffVisualGenerationProvider`
> mientras el flag esté OFF (verificado en código, `backend/agency/VisualGenerationProvider.ts`).
> Este documento es la checklist que **cualquier** futuro proveedor debe pasar, por escrito,
> antes de que el CEO autorice conectarlo — no aprueba ningún proveedor concreto hoy.

## Cómo usar esta matriz

Antes de integrar cualquier proveedor de generación visual (imagen, vídeo, voz), rellena una
fila por proveedor candidato. Si una columna queda en rojo (❌) sin mitigación aceptada por
Daniel, el proveedor **no se conecta**, sin excepción.

| Criterio | Qué se exige | Fail-closed si no se cumple |
|----------|---------------|-------------------------------|
| **Privacidad** | El proveedor no debe entrenar sus modelos con nuestros prompts/inputs ni con activos de clientes salvo opt-out contractual explícito y verificable | ❌ No se conecta sin cláusula de no-entrenamiento por escrito |
| **Licencia comercial** | Licencia comercial explícita para uso en marketing de terceros (nuestros clientes), no solo uso personal/interno | ❌ `commercialUseOk` en `VisualEliteGate` exige `license` no vacío — el código ya bloquea el render sin ella |
| **Coste máximo por cliente** | Techo de gasto por cliente/mes definido y auditable ANTES de conectar (ej. tope en céntimos por brief, `budgetCentsMax`) | ❌ El gate de presupuesto (`budgetOk`) ya bloquea cualquier render sin `budgetCentsMax > 0`; un proveedor sin techo contractual no se conecta |
| **Consentimiento** | Si el proveedor usa datos/imágenes de personas reales, se exige consentimiento documentado por escrito, gestionado fuera de este repo | ❌ No se genera contenido con personas reales sin consentimiento verificado por Daniel |
| **Aprobación CEO** | Ningún proveedor se activa en producción sin que Daniel autorice explícitamente ese proveedor concreto (no un OK genérico a "IA visual") | ❌ `NELVYON_VISUAL_GENERATION_ENABLED` permanece `0` hasta esa autorización nombrada |
| **Fail-closed por defecto** | Si falta cualquier config (API key, budget, license, aprobación humana), el sistema debe caer a `strategy_only` — nunca a un render silencioso | ✅ Ya implementado: `OffVisualGenerationProvider` es el default; cualquier gate faltante bloquea `render_approved` (`VisualEliteStrategyPipeline.runVisualEliteStrategyPipeline`) |

## Paid social — sigue OFF

Este documento cubre generación visual, no distribución. Independientemente del proveedor
visual elegido, la publicación con presupuesto de pago (paid ads) permanece bloqueada por
separado — ver `docs/ops/NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md` y el flag
`paid_social_status: PREPARED_OFF` en `NelvyonOfficialSocialPrep.ts`. Conectar un proveedor
visual **no** implica ni habilita gasto en anuncios.

## Estado actual (referencia de código)

| Elemento | Estado |
|----------|--------|
| `NELVYON_VISUAL_GENERATION_ENABLED` | `0` (repo default) |
| Proveedor activo | `OffVisualGenerationProvider` — `costCents` siempre `0`, `assetUrl` siempre `null` |
| Flujo `VISUAL_ELITE_STRATEGY_FLOW` | `brief → creative_direction → script → storyboard → prompts → variants → elite_visual_review → human_approval → delivery_package` |
| Aprobación humana | Obligatoria (`humanApprovalRequired: true`) incluso en modo `strategy_only` |
| Ledger de coste | En memoria, vacío por defecto (`listVisualCostLedger()`) |

## Próximo paso EXACTO

1. Cuando exista un proveedor candidato, se rellena una fila de esta matriz con evidencia
   escrita (contrato/ToS) para cada criterio.
2. Daniel revisa y aprueba ese proveedor concreto por nombre.
3. Solo entonces se implementa un adaptador `VisualGenerationProvider` real para ese
   proveedor y se activa `NELVYON_VISUAL_GENERATION_ENABLED=1` en staging primero, nunca
   directo a producción.
