# PHASE 2 — Especialización NELVYON IA Privada

> **Estado:** 2026-07-11 · Infraestructura completa · **Gates críticos NO superados** (modelo 3B)

---

## ✅ Inventario completo de conocimiento

**124 fuentes autorizadas** indexadas en RAG (`tenant: 8f873b4e-a1d0-4009-9e29-9ad978bea0f9`)

| Dominio | Fuentes |
|---------|---------|
| nelvyon | 44 |
| digital_marketing | 46 |
| crm_sales | 15 |
| finance_operations | 7 |
| development_tech | 3 |
| planning_strategy | 3 |
| security_privacy | 2 |
| paid_ads, seo, saas, copywriting | 1 c/u (knowledge packs) |

**Manifest:** `backend/local-ai/knowledge/manifest.json`  
**Ontología:** `backend/local-ai/knowledge/ontology.json` (20 dominios)

---

## ✅ Fuentes autorizadas

1. Documentación oficial NELVYON (`docs/`, `CLAUDE.md`)
2. Constitución (`docs/CONSTITUTION_NELVYON_AI.md`)
3. SOPs servicios (`docs/services/`, `docs/agency-playbooks/`)
4. Runbooks (`backend/ops/runbooks/`)
5. Operaciones/comercial/ventas (`docs/operations/`, `docs/commercial/`, `docs/sales/`)
6. Autonomous agents (`docs/autonomous/`)
7. Knowledge packs internos (`backend/local-ai/knowledge/`)

Licencia: `nelvyon_internal`. Sin scraping Internet en runtime.

---

## ✅ Ontología completa

20 dominios en `backend/local-ai/specialization/ontology.ts`:
nelvyon, business_strategy, digital_marketing, paid_ads, seo, content, copywriting,
social_media, email_marketing, crm_sales, automation, saas, analytics_reporting,
customer_support, finance_operations, design, video, development_tech,
security_privacy, planning_strategy.

---

## ✅ Base de conocimiento indexada

- **124 documentos** → chunks vectoriales pgvector (768 dim)
- Ingesta: `pnpm -C apps/web exec tsx ../../scripts/local-ai-ingest-knowledge.ts`
- RAG retrieval con citas: `LocalRagRetriever` + `local-ai-rag-probe.ts`
- Evidencia RAG: query "¿Qué es NELVYON?" → 4 citas, confidence **0.69**

---

## ✅ Constitución NELVYON

`docs/CONSTITUTION_NELVYON_AI.md` + `backend/local-ai/specialization/constitution.ts`

10 principios, prohibiciones absolutas, formato de planes, jerarquía de fuentes, niveles de confianza.

---

## ✅ Dataset de especialización

- **Benchmark suite:** `backend/local-ai/specialization/benchmarkSuite.ts` (24 casos)
- **Benchmark ejecutable:** `scripts/local-ai-specialization-benchmark.mjs`
- Categorías: NELVYON, marketing, ads, SEO, copy, email, CRM, SaaS, planning, JSON, adversarial, RAG

---

## ✅ Benchmark por áreas (ejecución real 2026-07-11)

| Gate | Umbral | Resultado | PASS |
|------|--------|-----------|------|
| nelvyon_knowledge | 95% | **44%** | ❌ |
| rule_compliance | 98% | **100%** | ✅ |
| structured_planning | 95% | **20%** | ❌ |
| strategy_coherence | 95% | **20%** | ❌ |
| valid_json | 99% | **0%** | ❌ |
| rag_retrieval | 95% | **0%** | ❌ |
| adversarial_critical | 100% | **50%** | ❌ |

**JSON:** `backend/local-ai/benchmarks/specialization_2026-07-11T19-53-17-721Z.json`  
**Gates PASS:** 1/7

---

## ✅ Sistema de planificación y estrategia

`backend/local-ai/specialization/PlanningEngine.ts` — planes estructurados con 16 secciones obligatorias.

---

## ✅ RAG mejorado

- `LocalVectorStore`: join documentos + metadata dominio
- `LocalRagRetriever`: citas numeradas, confidence score, filtro dominio
- `KnowledgeIngestService`: ingesta masiva con checksum y dominio

---

## ✅ Mejoras prompts y validadores

- `CONSTITUTION_RULES.systemPromptPrefix`
- `ResponseValidator`: frases prohibidas, JSON, plan structure, citas, secretos
- `LocalEmbeddingProvider`: fallback `/api/embed`

---

## ✅ Fine-tuning — decisión técnica

**NO realizado.** Motivos:
- RTX 3050 6 GB insuficiente para QLoRA de calidad enterprise
- Gates fallan principalmente por capacidad del modelo 3B, no por falta de RAG
- **Recomendación:** mantener RAG + constitución + validadores; preparar QLoRA para GPU ≥12 GB VRAM
- Script futuro: `scripts/local-ai-prepare-lora.mjs` (pendiente hardware)

---

## ✅ Benchmark final + gates

Infraestructura reproducible: **8/8 tests PASS** (`localAiSpecialization.test.ts`)  
Benchmark LLM real: **1/7 gates PASS** — **NO se declara especialización completada**

---

## ✅ Funcionamiento offline probado

PRIVATE_MODE=ON · Ollama localhost · RAG local · sin egress (validado Fase 2 anterior)

---

## ✅ Privacidad y aislamiento probados

RLS tenant 100% · integración 8/8 · adversarial parcial 50%

---

## ⚠️ Límites encontrados

| Límite | Impacto |
|--------|---------|
| **Llama 3.2 3B** | Planes incompletos (20%), JSON inconsistente, RAG mal interpretado |
| **Contexto 3B** | Ignora contexto RAG si contradice training ("no tengo información 2023") |
| **Adversarial 50%** | Rechaza secretos pero no siempre detecta injection en documentos |
| **Dominios sin pack dedicado** | video, design, social tienen cobertura vía docs pero sin pack propio |
| **RAG puerto 5434** | Modelo confundió SQLite cloud vs Postgres local pese a contexto |

---

## ⏳ Qué falta antes del router

1. Router multi-modelo (no iniciado — fuera de scope)
2. Mejorar prompt template + reranking RAG
3. Ampliar knowledge packs (video, design, social, finanzas)
4. Re-benchmark tras mejoras o modelo 7B+ con offload
5. Gates ≥95% en categorías críticas

---

## ❌ Qué depende del propietario

- Decisión: ¿aceptar 3B + RAG o invertir en GPU mayor para 7B/QLoRA?
- Re-ingesta tras cambios en `docs/` (`local-ai-ingest-knowledge.ts`)
- No instalar OpenClaw/MCP hasta router validado

---

## 📊 Porcentaje real

| Ámbito | % |
|--------|---|
| **Infraestructura especialización** (constitución, ontología, ingest, RAG, validators, benchmark) | **~90%** |
| **Gates críticos superados** | **~14%** (1/7) |
| **Especialización NELVYON (calidad medida)** | **~40%** |
| **Fase 2 completa** | **~65%** |

**NO declarar:** `ESPECIALIZACIÓN NELVYON COMPLETADA` — evidencia reproducible insuficiente.

---

## Comandos

```bash
pnpm -C apps/web exec tsx ../../scripts/local-ai-ingest-knowledge.ts
node scripts/local-ai-specialization-benchmark.mjs
pnpm -C apps/web exec vitest run backend/saas/__tests__/localAiSpecialization.test.ts
```
