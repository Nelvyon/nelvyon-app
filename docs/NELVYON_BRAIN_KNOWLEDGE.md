# NELVYON BRAIN — Cobertura de conocimiento (evidencia)

> Actualizado **2026-07-20** tras Bloque 1: Docker + preflight + ingest.  
> `claimComplete: false` siempre — no se declara conocimiento 100 % completo.  
> Ingest vectorial **`verified:true`** (local-ai Postgres + Ollama).

Artefactos:
- `backend/local-ai/knowledge/manifest.json`
- `backend/local-ai/benchmarks/knowledge_gap_report.json`
- `backend/local-ai/benchmarks/knowledge_audit.json`
- `backend/local-ai/benchmarks/knowledge_archive_log.json`
- `backend/local-ai/benchmarks/knowledge_ingest_evidence.json`

---

## Informe Bloque 1 (números verificados 2026-07-20)

| Métrica | Valor |
|---------|-------|
| Entradas manifiesto (`summary.total`) | **278** |
| Ficheros únicos (`summary.uniqueFiles`) | **244** |
| `coverageRatioEstimate` | **0.99** |
| `claimComplete` | **false** |
| Orphans (`orphanDocs`) | **0** |
| Ingest `verified` | **true** |
| Vector chunks (`vectorStoreChunks`) | **1559** |
| Preflight | **PASS** (docker + postgres `:5434` + ollama models=6) |
| Contenedor | `nelvyon-local-ai-postgres` **healthy** |
| Fix tooling | ADR-030 — `apps/web/tsconfig.json` `paths.pg` → runtime `pg` |

**No se declara READY ni claimComplete.** Evidencia: `knowledge_ingest_evidence.json`.

---

## Pipeline SSOT

`buildKnowledgeManifest()` → ingest (`KnowledgeIngestService`) → `LocalVectorStore` / `LocalRagRetriever` → `UnifiedRagStore` → `AgentContextEngine` (Nelvyon-first).

Comandos:

```powershell
docker compose -f backend/local-ai/docker-compose.yml up -d
node scripts/preflight-local-ai-ingest.mjs
$env:NELVYON_KNOWLEDGE_INGEST="1"; node scripts/nelvyon-knowledge-sync.mjs
```

---

## Historial (pre-Bloque 1)

| Fecha | Ingest verified | Notas |
|-------|-----------------|-------|
| 2026-07-19 | false | Docker daemon down; orphans 0 tras archive wave 2; coverage 0.95 |
| 2026-07-20 | **true** | Bloque 1 cerrado |
