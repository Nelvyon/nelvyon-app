# CEO — Opciones seguras post canary IA prod (ADR-069)

> **Estado: CEO Option A autorizada para PREPARACIÓN** · canary **aún OFF** · coste **0**  
> Fecha prep: **2026-07-27** · OpenAI OFF · pregunta apertura: `CEO_PROD_CANARY_OPEN_YN.md`

## Contexto (1 párrafo)

El canary prod falló al intentar Postgres local `127.0.0.1:5434`. Kill switch OK. Código fail-closed. CEO eligió **Opción A**: preparar schema RAG en DB principal **sin** abrir canary todavía.

## Decisión

| # | Opción | Estado 2026-07-27 |
|---|--------|-------------------|
| **A** | Base principal prod + schema RAG autorizado | **PREP DONE** (schema+RLS+URL) · canary **not** opened |
| **B** | IA productiva apagada | supersedida por A prep |

## Firma prep

| Rol | Decisión | Fecha |
|-----|----------|-------|
| CEO | Option A — preparación segura only | 2026-07-27 (chat) |

**claimReady: false.** Apertura canary = solo tras SÍ en `CEO_PROD_CANARY_OPEN_YN.md`.
