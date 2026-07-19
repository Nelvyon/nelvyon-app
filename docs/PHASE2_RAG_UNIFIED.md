# PHASE2 — RAG unificado (KI-005)

> Facade SSOT para Private AI / MCP · **LocalModelRouter intacto** (certificación)

## Decisión (ADR-025)

| Preferido | Fallback | No tocar |
|-----------|----------|----------|
| `LocalRagRetriever` (pgvector cert) | `NelvyonRagStore` (ILIKE) | `LocalModelRouter` → `getLocalRagRetriever()` directo |

Implementación: `backend/private-ai/rag/UnifiedRagStore.ts` implementa `IRagStore`.

## Flags

| Flag | Default | Efecto |
|------|---------|--------|
| `NELVYON_RAG_PREFER_LOCAL` | `1` | Intenta local-ai vector; si vacío/error → ILIKE |
| `NELVYON_RAG_PREFER_LOCAL=0` | — | Solo adjunct ILIKE (rollback inmediato) |
| `LOCAL_AI_PLATFORM_TENANT_ID` | uuid fixed | Tenant usado en retrieve platform |

## Cableado

- `PrivateAiOrchestrator` usa `getUnifiedRagStore(db)` por defecto
- MCP `rag_search` → misma facade (empty-safe si falla)

## Rollback

1. `NELVYON_RAG_PREFER_LOCAL=0` — sin redeploy de código Router
2. O inyectar `deps.rag = new NelvyonRagStore(db)` en tests/orquestador

## Plan migración datos (ops, no bloqueante repo)

1. Ingest corpus a local-ai vector (`KnowledgeIngestService`)
2. Validar retrieve scores en staging
3. Mantener `nelvyon_rag_chunks` como mirror/read-fallback hasta cutover
4. No drop ILIKE table hasta soak Private AI verde
