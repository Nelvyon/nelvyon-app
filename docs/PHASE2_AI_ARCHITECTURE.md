# PHASE 2 — Arquitectura IA Local NELVYON

> **100% local · PostgreSQL + pgvector · Sin cloud obligatorio**

---

## Principios

1. Toda inteligencia privada vive en el **ordenador del propietario**
2. `PRIVATE_MODE=ON` por defecto — egress allowlist estricta
3. Aislamiento **tenant_id** (+ `client_id`, `source_id`, checksum, versión)
4. Sin SQLite en producción (solo tests aislados)
5. Sin Qdrant/Weaviate — **pgvector en PostgreSQL local**

---

## Stack

```
┌─────────────────────────────────────────────────────────┐
│  Owner machine (Windows / Linux)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Ollama      │  │ OpenClaw     │  │ MCP servers     │ │
│  │ 127.0.0.1   │  │ Docker/local │  │ localhost       │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘ │
│         │                 │                    │         │
│  ┌──────▼─────────────────▼────────────────────▼──────┐ │
│  │ backend/private-ai/ + backend/local-ai/            │ │
│  │ PrivateAiRouter · LocalMemoryStore · RAG pipeline  │ │
│  └──────────────────────┬─────────────────────────────┘ │
│                         │                               │
│  ┌──────────────────────▼─────────────────────────────┐ │
│  │ Docker: pgvector/pgvector:pg16                     │ │
│  │ 127.0.0.1:5434 · volume nelvyon_local_ai_pgdata    │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ./backend/local-ai/backups/ (pg_dump + AES opt.)   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Módulos implementados

| Módulo | Ruta | Función |
|--------|------|---------|
| Docker Compose | `backend/local-ai/docker-compose.yml` | Postgres+pgvector, bind 127.0.0.1 |
| Migraciones | `backend/local-ai/migrations/001_local_ai_base.sql` + `002_local_ai_app_role.sql` | memory, RAG, audit, ingest, app role |
| DB client | `backend/local-ai/db.ts` | Pool + `set_config('app.tenant_id')` + RLS (app role NOBYPASSRLS) |
| Memoria | `backend/local-ai/LocalMemoryStore.ts` | Write/search vector por tenant |
| Vector RAG | `backend/local-ai/LocalVectorStore.ts` | Búsqueda chunks |
| Embeddings | `backend/local-ai/LocalEmbeddingProvider.ts` | Ollama `/api/embeddings` |
| Ingesta | `backend/local-ai/RagIngestPipeline.ts` | Chunk + embed + persist |
| Backup | `backend/local-ai/LocalAiBackupService.ts` | pg_dump gzip + AES-256-GCM |
| Health | `backend/local-ai/LocalAiHealth.ts` | Probe postgres/pgvector/schema |
| Egress | `backend/private-ai/privateMode.ts` | Allowlist localhost/Docker |

---

## Scripts operativos

| Script | Uso |
|--------|-----|
| `node scripts/hardware-audit.mjs` | Auditoría CPU/GPU/RAM |
| `node scripts/local-ai-up.mjs` | `docker compose up -d` |
| `node scripts/local-ai-down.mjs` | Parada limpia |
| `node scripts/local-ai-migrate.mjs` | Aplicar SQL |
| `pnpm -C apps/web exec tsx ../../scripts/local-ai-health.ts` | Health JSON |
| `node scripts/local-ai-validate.mjs` | Validación completa (7 checks) |
| `node scripts/local-ai-backup.mjs` | pg_dump vía Docker |

**Validado 2026-07-11:** up, migrate, health OK, validate 7/7, integración 8/8.

---

## Seguridad RLS

- Tablas con `ENABLE ROW LEVEL SECURITY` + **FORCE ROW LEVEL SECURITY**
- Conexión app: `nelvyon_local_app` (NOBYPASSRLS, no superuser)
- Migraciones/admin: `nelvyon_local` vía `docker exec` solamente

## Esquema de datos (aislamiento)

Todas las tablas `local_ai_*` incluyen:

- `tenant_id` (obligatorio)
- `client_id` (opcional)
- `source_id`, `checksum`, `version`, `permissions`, `status`
- RLS: `tenant_id = current_setting('app.tenant_id')`

---

## Pendiente (post-base)

- Router multi-modelo + benchmark automatizado
- 22 agentes especializados (no iniciar hasta validar base)
- Wiring `OsLlmClientAdapter` → local stack
- UI gestión local (opcional)

Ver `docs/TODO.md` Fase 2.
