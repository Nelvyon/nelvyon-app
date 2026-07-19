# NELVYON BRAIN — Cobertura de conocimiento (evidencia)

> Generado tras `node scripts/nelvyon-knowledge-sync.mjs` · **2026-07-19**  
> `claimComplete: false` siempre — no se declara conocimiento 100 % completo.

Artefactos:
- `backend/local-ai/knowledge/manifest.json` (paths relativos)
- `backend/local-ai/benchmarks/knowledge_gap_report.json`
- `backend/local-ai/benchmarks/knowledge_audit.json`

---

## 1. Cobertura del conocimiento interno

| Métrica | Valor (última sync) |
|---------|---------------------|
| Entradas manifiesto | **184** |
| Ficheros únicos | **161** |
| Dominios ontología | 20 (todos con ≥2 fuentes tras packs) |
| Living docs críticos indexados | DECISIONS, CHANGELOG, HANDOVER, DATABASE, AGENT_WORKFLOW_CATALOG, AUTONOMOUS_WORKFORCE_CERT, FINAL_ELITE_CLOSURE, KNOWN_ISSUES, INFRASTRUCTURE |
| `coverageRatioEstimate` | **0.75** (penaliza orphans; tope &lt; 1.0; nunca claimComplete) |
| Orphans detectados | **80** bajo `docs/*.md` / services / operations / runbooks no mapeados |

**SSOT:** `buildKnowledgeManifest()` → ingest → `LocalVectorStore` / `LocalRagRetriever` → `UnifiedRagStore` → `AgentContextEngine` (Nelvyon-first).

---

## 2. Áreas cubiertas y pendientes

### Cubiertas (con fuentes en manifiesto)
- Arquitectura, ADR, handover, roadmap, TODO, status  
- Workforce / workflows / certs / elite closure  
- SaaS/OS/portal SOPs y runbooks mapeados  
- Dominios: marketing, SEO, ads, CRM, automation, finance, support, design, video, security, devops packs  
- Packs nuevos: `entrepreneurship_ops.md`, `cybersecurity_cloud.md`

### Pendientes (honestos)
- **~80 orphans** — docs top-level o SOPs sin asignación de dominio (revisar uno a uno; no indexar basura)  
- **Ingest vector live** — requiere Postgres local-ai UP (`NELVYON_KNOWLEDGE_INGEST=1`)  
- **Código fuente completo** — no se indexa todo el árbol TS (deuda consciente; preferir docs + packs)  
- **Commits git raw** — no hay auto-ingest de cada commit; CHANGELOG + ADR sí  
- **HR/logística profundas** — cubiertas parcialmente vía entrepreneurship_ops / finance; sin pack dedicado exhaustivo  
- **Contenido externo** — registry allowlist only; deny-by-default full-text  

---

## 3. Mecanismos de actualización automática

| Mecanismo | Cómo |
|-----------|------|
| `scripts/nelvyon-knowledge-sync.mjs` | Regenera manifest portable + gap/audit JSON |
| CI `web-quality-gates` | Ejecuta sync en cada cambio backend/web |
| `local-ai-ingest-knowledge.ts` | Embed + Postgres cuando DB disponible |
| Checksum skip | `KnowledgeIngestService` no re-embebe si checksum igual |
| Gap detector | `detectKnowledgeGaps()` → propuestas |
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

**No medido en este cierre:** latencia p95 live ingest (depende de Ollama/DB).

---

## 5. Propuesta de mejora continua

1. Reducir orphans: mapear o archivar docs huérfanos en `auditManifest` (P1).  
2. Tras cada merge de docs: CI sync ya corre; en staging con pgvector: `NELVYON_KNOWLEDGE_INGEST=1`.  
3. Ampliar packs thin (HR, logística, product UX) solo con contenido NELVYON-verificado.  
4. Opcional: job post-commit que dispare sync solo si cambian `docs/**` o `backend/local-ai/knowledge/**`.  
5. Promover corpus sintético a LocalVectorStore para métricas = prod.  
6. Mantener `claimComplete: false` hasta orphans ≈ 0 **y** ingest live verificado.

---

## Cómo operar

```powershell
node scripts/nelvyon-knowledge-sync.mjs
# Con DB local-ai:
$env:NELVYON_KNOWLEDGE_INGEST="1"
node scripts/nelvyon-knowledge-sync.mjs
# o
pnpm -C apps/web exec tsx ../../scripts/local-ai-ingest-knowledge.ts
```
