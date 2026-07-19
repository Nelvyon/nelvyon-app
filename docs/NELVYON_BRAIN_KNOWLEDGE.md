# NELVYON BRAIN — Cobertura de conocimiento (evidencia)

> Generado tras `node scripts/archive-classified-orphans.mjs` + `node scripts/nelvyon-knowledge-sync.mjs` — **2026-07-19**
> `claimComplete: false` siempre — no se declara conocimiento 100 % completo.
> Ingest vectorial **no verificado** (Docker daemon down).

Artefactos:
- `backend/local-ai/knowledge/manifest.json` (paths relativos)
- `backend/local-ai/benchmarks/knowledge_gap_report.json`
- `backend/local-ai/benchmarks/knowledge_audit.json`
- `backend/local-ai/benchmarks/knowledge_archive_log.json`
- `backend/local-ai/benchmarks/knowledge_ingest_evidence.json`

---

## Informe final de fase (números verificados)

| Métrica | Valor |
|---------|-------|
| Entradas manifiesto (`summary.total`) | **217** |
| Ficheros únicos (`summary.uniqueFiles`) | **192** |
| `coverageRatioEstimate` | **0.65** |
| `claimComplete` | **false** |
| Orphans (`orphanDocs`) | **86** |
| Unclassified active (`unclassifiedActiveDocs`) | **86** |
| Archivados esta corrida (`archivedCount` / log `moved`) | **49** |
| `agentsWithoutRag` | **[]** (vacío) |
| `agentsMissingDomainMap` | **[]** |
| `domainsThin` | **[]** |
| `criticalLivingDocsMissing` | **[]** |
| Ingest `verified` | **false** |
| Bloqueador ingest | Docker Desktop daemon no está en marcha → Postgres local-ai `127.0.0.1:5434` no disponible |

**No se fuerza PASS de ingest.** Evidencia honesta en `knowledge_ingest_evidence.json`.

---

## 1. Cobertura del conocimiento interno

| Métrica | Valor (última sync) |
|---------|---------------------|
| Entradas manifiesto | **217** |
| Ficheros únicos | **192** |
| Dominios ontología | 20 (todos con ≥2 fuentes tras packs) |
| Living docs críticos indexados | DECISIONS, CHANGELOG, HANDOVER, DATABASE, AGENT_WORKFLOW_CATALOG, AUTONOMOUS_WORKFORCE_CERT, FINAL_ELITE_CLOSURE, KNOWN_ISSUES, INFRASTRUCTURE |
| `coverageRatioEstimate` | **0.65** (penaliza orphans; tope &lt; 1.0; nunca claimComplete) |
| Orphans detectados | **86** bajo `docs/*.md` / services / operations / runbooks no mapeados (tras archivar 49 clasificados) |

**SSOT:** `buildKnowledgeManifest()` → ingest → `LocalVectorStore` / `LocalRagRetriever` → `UnifiedRagStore` → `AgentContextEngine` (Nelvyon-first).

Clasificación de huérfanos: `orphanClassification.ts` (index / archive / ignore) + script `scripts/archive-classified-orphans.mjs` → `docs/archive/`.

---

## 2. Áreas cubiertas y pendientes

### Cubiertas (con fuentes en manifiesto)
- Arquitectura, ADR, handover, roadmap, TODO, status
- Workforce / workflows / certs / elite closure
- SaaS/OS/portal SOPs y runbooks mapeados
- Dominios: marketing, SEO, ads, CRM, automation, finance, support, design, video, security, devops packs
- Packs: entrepreneurship_ops, cybersecurity_cloud
- Agent domains: `agentKnowledgeDomains.ts` + registry wiring (0 agentsWithoutRag)

### Pendientes (honestos)
- **86 orphans** — docs top-level o SOPs sin asignación de dominio (revisar uno a uno; no indexar basura)
- **Ingest vector live** — bloqueado: Docker daemon down; requiere Postgres local-ai UP (`NELVYON_KNOWLEDGE_INGEST=1`)
- **Código fuente completo** — no se indexa todo el árbol TS (deuda consciente; preferir docs + packs)
- **Commits git raw** — no hay auto-ingest de cada commit; CHANGELOG + ADR sí
- **HR/logística profundas** — cubiertas parcialmente vía entrepreneurship_ops / finance; sin pack dedicado exhaustivo
- **Contenido externo** — registry allowlist only; deny-by-default full-text

---

## 3. Mecanismos de actualización automática

| Mecanismo | Cómo |
|-----------|------|
| `scripts/nelvyon-knowledge-sync.mjs` | Regenera manifest portable + gap/audit JSON |
| `scripts/archive-classified-orphans.mjs` | Mueve disposition=archive a `docs/archive/` (idempotente) |
| CI `web-quality-gates` | Ejecuta sync en cada cambio backend/web |
| `local-ai-ingest-knowledge.ts` | Embed + Postgres cuando DB disponible |
| Checksum skip | `KnowledgeIngestService` no re-embebe si checksum igual |
| Gap detector | `detectKnowledgeGaps()` → propuestas + ingestEvidence |
| External registry | `externalKnowledgeRegistry.ts` — provenance, sin scrape masivo |

---

## 4. Calidad RAG y memoria

| Capa | Estado |
|------|--------|
| RAG ranking | Boosts NELVYON oficiales + domain; penaliza local-ai ops en queries producto |
| Grounding | Prompt Nelvyon-first; declarar laguna sin hits |
| Agent context | Reglas obligatorias + RAG limit configurable (`NELVYON_AGENT_RAG_LIMIT`) |
| Shared Memory | Scopes + SecurityGuard; STM auto-write opt-in |
| Tenant isolation | RLS + tenantId en vector store |
| Eval | Synthetic corpus + specialization benchmark (existentes) |
| Tests | `nelvyonBrainKnowledge.test.ts` — **5/5 PASS** (2026-07-19) |

**No medido en este cierre:** latencia p95 live ingest (depende de Ollama/DB; Docker down).

---

## 5. Propuesta de mejora continua

1. Arrancar Docker + local-ai Postgres; correr ingest con `NELVYON_KNOWLEDGE_INGEST=1` y actualizar evidence a `verified:true` solo con chunks reales.
2. Reducir los **86** orphans restantes: mapear a dominio o archivar (P1); no indexar basura.
3. Tras cada merge de docs: CI sync ya corre; en staging con pgvector: ingest flag.
4. Ampliar packs thin (HR, logística, product UX) solo con contenido NELVYON-verificado.
5. Opcional: job post-commit que dispare sync solo si cambian `docs/**` o `backend/local-ai/knowledge/**`.

---

## 6. Criterio de cierre de fase (honesto)

| Criterio | ¿Cumple? |
|----------|----------|
| Manifest + gap detector operativos | Sí |
| Orphans clasificados y 49 archivados | Sí |
| Agents sin RAG / sin domain map | Sí (listas vacías) |
| `claimComplete` | **false** (correcto) |
| Ingest + UnifiedRag live verificado | **No** (Docker blocker) |
| Cobertura 100% | **No** (0.65 estimate) |

**Fase de cableado brain/RAG: cerrada a nivel código + clasificación.**  
**Fase de ingest verificado en vector store: abierta** hasta Docker + Postgres local-ai + evidence `verified:true`.
