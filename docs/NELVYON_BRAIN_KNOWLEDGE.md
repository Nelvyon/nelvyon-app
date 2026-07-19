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

## 4. Cobertura por dominio (manifiesto)

Fuente: `knowledge_gap_report.json` → `domainCoverage`. Todos **ok**; `domainsThin: []`.

| Dominio | Docs | % manifiesto | Lagunas | Prioridad |
|---------|------|--------------|---------|-----------|
| nelvyon | 77 | 29.3% | — | P2 |
| development_tech | 44 | 16.7% | — | P2 |
| digital_marketing | 26 | 9.9% | — | P2 |
| security_privacy | 18 | 6.8% | — | P2 |
| crm_sales | 17 | 6.5% | — | P2 |
| finance_operations | 15 | 5.7% | — | P2 |
| saas | 9 | 3.4% | — | P2 |
| planning_strategy | 9 | 3.4% | — | P2 |
| paid_ads | 7 | 2.7% | — | P2 |
| design | 6 | 2.3% | — | P2 |
| business_strategy | 5 | 1.9% | — | P2 |
| seo | 5 | 1.9% | — | P2 |
| automation | 5 | 1.9% | — | P2 |
| social_media | 4 | 1.5% | — | P2 |
| video | 4 | 1.5% | — | P2 |
| content | 3 | 1.1% | — | P2 |
| customer_support | 3 | 1.1% | — | P2 |
| copywriting | 2 | 0.8% | profundidad | P2 |
| email_marketing | 2 | 0.8% | profundidad | P2 |
| analytics_reporting | 2 | 0.8% | profundidad | P2 |

Profundidad pendiente (no thin): HR/logística dedicadas; packs copy/email/analytics más densos.

---

## 5. Calidad RAG, agentes y memoria

| Capa | Estado | Evidencia |
|------|--------|-----------|
| RAG ranking + domain hint | Cableado | `UnifiedRagStore` → `retrieve({ domain })` |
| Grounding Nelvyon-first | OK (unit) | `AgentContextEngine` + test 7/7 |
| Agentes con `rag.search` | **23/23** | `agentsWithoutRag: []` |
| Mapa agente→dominio | **23/23** | `agentKnowledgeDomains.ts` |
| Shared Memory | Intacta | scopes + SecurityGuard + STM opt-in |
| Tenant / Agent memory | Intacta | `TenantMemoryAdapter` + Shared Memory layers |
| Project / Knowledge / Session | Vía Shared Memory scopes | sin stack paralelo |
| Tenant isolation | Intacta | RLS + tenantId vector store |
| Ingest → embeddings → vector | **NO verificado live** | Docker down; Ollama UP |

**No medido:** latencia p95 live retrieval ni grounding E2E con chunks reales.

---

## 6. Propuesta de mejora continua

1. Arrancar Docker + local-ai Postgres; correr ingest con `NELVYON_KNOWLEDGE_INGEST=1` y actualizar evidence a `verified:true` solo con chunks reales.
2. Mantener **0 orphans**: al añadir docs top-level, clasificar en `orphanClassification.ts` (index/archive) antes del merge.
3. Tras cada merge de docs: CI sync ya corre; en staging con pgvector: ingest flag.
4. Ampliar packs thin (HR, logística, product UX) solo con contenido NELVYON-verificado.
5. Opcional: job post-commit que dispare sync solo si cambian `docs/**` o `backend/local-ai/knowledge/**`.

---

## 7. Criterio de cierre de fase (honesto)

| Criterio | ¿Cumple? |
|----------|----------|
| Manifest + gap detector operativos | Sí |
| Orphans activos / unclassified | **0 / 0** |
| Archivados acumulados | **93** |
| Agents sin RAG / sin domain map | Sí (listas vacías) |
| Tests brain | **7/7 PASS** |
| `claimComplete` | **false** (correcto) |
| Ingest + UnifiedRag live verificado | **No** (Docker blocker) |
| Cobertura 100% | **No** (0.95 estimate) |

**Fase clasificación orphans: cerrada.**  
**Fase ingest verificado en vector store: abierta** hasta Docker + Postgres local-ai + evidence `verified:true`.