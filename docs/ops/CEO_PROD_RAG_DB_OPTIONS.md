# CEO — Opciones seguras post canary IA prod (ADR-069)

> **Estado: PENDING_CEO** · coste **0** · OpenAI OFF · canary **KILL ON** · **NO** reactivar hasta decisión  
> Fecha: **2026-07-27** · tip fix código (fail-closed localhost) · staging RAG ya verified

## Contexto (1 párrafo)

El canary prod falló al intentar Postgres local `127.0.0.1:5434`. Kill switch OK. El código **ya prohíbe** ese fallback en producción. Falta decidir la base RAG antes de cualquier reapertura.

## Solo dos opciones

| # | Opción | Qué implica | Qué NO implica |
|---|--------|-------------|----------------|
| **A** | Usar **base principal de producción** con schema RAG `local_ai_*` **explícitamente autorizado** | Tras validar en **staging** (ya IMPLEMENTED_VERIFIED): ADR-064 approval + apply schema en prod + `NELVYON_LOCAL_AI_USE_MAIN_DB=1` solo en ventana canary · luego smoke · kill | OpenAI · MCP · SM · OpenClaw · campañas · pagos · ads · canary auto-on |
| **B** | Mantener **IA productiva apagada** | KILL=1 · AI=0 · sin USE_MAIN_DB · sin DDL prod · mesh puede quedar preparado | Ningún canary · ningún coste IA |

## Respuesta esperada (una frase)

- **A** — «Autorizo schema RAG en DB principal de producción bajo ADR-064, tras revalidar staging.»  
- **B** — «Mantener IA productiva apagada.»

## Firma

| Rol | Decisión A / B | Fecha | Firma |
|-----|----------------|-------|-------|
| CEO | ____ | ____-__-__ | ________ |

**claimReady permanece false.** No reintentar canary sin A validada en staging + approval escrito.
