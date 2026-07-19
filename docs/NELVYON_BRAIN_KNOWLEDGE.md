# NELVYON BRAIN — Cobertura de conocimiento (evidencia)

> Generado tras `node scripts/archive-classified-orphans.mjs` + `node scripts/nelvyon-knowledge-sync.mjs` — **2026-07-19** (orphan wave 2)
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
| Entradas manifiesto (`summary.total`) | **263** |
| Ficheros únicos (`summary.uniqueFiles`) | **234** |
| `coverageRatioEstimate` | **0.95** |
| `claimComplete` | **false** |
| Orphans (`orphanDocs`) | **0** |
| Unclassified active (`unclassifiedActiveDocs`) | **0** |
| Archivados acumulados (`archivedCount`) | **93** |
| Movidos esta corrida (wave 2 `moved`) | **44** (skipped 49 ya archivados) |
| `agentsWithoutRag` | **[]** (vacío) |
| `agentsMissingDomainMap` | **[]** |
| `domainsThin` | **[]** |
| `criticalLivingDocsMissing` | **[]** |
| Ingest `verified` | **false** |
| Bloqueador ingest | Docker Desktop daemon no está en marcha → Postgres local-ai `127.0.0.1:5434` no disponible |

**No se fuerza PASS de ingest.** Evidencia honesta en `knowledge_ingest_evidence.json`.  
**Orphan paths restantes:** ninguno.

---

## 1. Cobertura del conocimiento interno

| Métrica | Valor (última sync) |
|---------|---------------------|
| Entradas manifiesto | **263** |
| Ficheros únicos | **234** |
| Dominios ontología | 20 (todos con ≥2 fuentes tras packs) |
| Living docs críticos indexados | DECISIONS, CHANGELOG, HANDOVER, DATABASE, AGENT_WORKFLOW_CATALOG, AUTONOMOUS_WORKFORCE_CERT, FINAL_ELITE_CLOSURE, KNOWN_ISSUES, INFRASTRUCTURE |
| `coverageRatioEstimate` | **0.95** (penaliza orphans; tope &lt; 1.0; nunca claimComplete) |
| Orphans detectados | **0** (wave 2: 44 archivados adicionales; acumulado archivedCount **93**) |

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
- Orphan wave 2: top-level `docs/*.md` restantes clasificados (index/archive) → **0 orphans activos**

### Pendientes (honestos)
- **Ingest vector live** — bloqueado: Docker daemon down; requiere Postgres local-ai UP (`NELVYON_KNOWLEDGE_INGEST=1`)
- **Código fuente completo** — no se indexa todo el árbol TS (deuda consciente; preferir docs + packs)
- **Commits git raw** — no hay auto-ingest de cada commit; CHANGELOG + ADR sí
- **HR/logística profundas** — cubiertas parcialmente vía entrepreneurship_ops / finance; sin pack dedicado exhaustivo
- **Contenido externo** — registry allowlist only; deny-by-default full-text
- Cobertura estimada **0.95** ≠ 100 % (`claimComplete` permanece **false**)

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
| Tests | `nelvyonBrainKnowledge.test.ts` — **7/7 PASS** (2026-07-19) |

**No medido en este cierre:** latencia p95 live ingest (depende de Ollama/DB; Docker down).

---

## 5. Propuesta de mejora continua

1. Arrancar Docker + local-ai Postgres; correr ingest con `NELVYON_KNOWLEDGE_INGEST=1` y actualizar evidence a `verified:true` solo con chunks reales.
2. Mantener **0 orphans**: al añadir docs top-level, clasificar en `orphanClassification.ts` (index/archive/ignore) antes del merge.
3. Tras cada merge de docs: CI sync ya corre; en staging con pgvector: ingest flag.
4. Ampliar packs thin (HR, logística, product UX) solo con contenido NELVYON-verificado.
5. Opcional: job post-commit que dispare sync solo si cambian `docs/**` o `backend/local-ai/knowledge/**`.

---

## 6. Criterio de cierre de fase (honesto)

| Criterio | ¿Cumple? |
|----------|----------|
| Manifest + gap detector operativos | Sí |
| Orphans clasificados; wave 2 archivó 44 (acum. 93) | Sí |
| Orphans activos / unclassified | **0 / 0** |
| Agents sin RAG / sin domain map | Sí (listas vacías) |
| `claimComplete` | **false** (correcto) |
| Ingest + UnifiedRag live verificado | **No** (Docker blocker) |
| Cobertura 100% | **No** (0.95 estimate) |

**Fase orphan classification (wave 2): cerrada** — 0 orphans activos.  
**Fase de ingest verificado en vector store: abierta** hasta Docker + Postgres local-ai + evidence `verified:true`.
