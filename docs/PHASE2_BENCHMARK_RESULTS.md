# PHASE 2 — Benchmark Results (Ollama)

> **Ejecutado:** 2026-07-11 · Máquina propietario · Ollama 0.31.2  
> **Hardware:** Ryzen 7 5700X · 32 GB RAM · RTX 3050 6 GB · Driver 596.21  
> **Script:** `node scripts/local-ai-benchmark.mjs`  
> **JSON:** `backend/local-ai/benchmarks/benchmark_2026-07-11T16-30-34-040Z.json`

---

## ✅ Modelos probados

### LLM (3B Q4 — shortlist hardware)

| Modelo | Tamaño | Composite | tok/s | VRAM pico | Español | Razonamiento | Tools JSON | Contexto |
|--------|--------|-----------|-------|-----------|---------|--------------|------------|----------|
| **llama3.2:3b-instruct-q4_K_M** | 2.0 GB | **81.5** | 2.9–56.9* | 3566 MiB | 100 | 100 | 100 | 100 |
| qwen2.5:3b-instruct-q4_K_M | 1.9 GB | 63.0 | 5.0–55.5 | 3095 MiB | 85 | 40 | 100 | 70 |
| phi3:mini | 2.2 GB | 58.9 | 8.7–57.5 | **4749 MiB** | 85 | 100 | **0** | 70 |

\* Primer token frío más lento; prompts cortos ~40–57 tok/s.

### Embeddings

| Modelo | Dim | Latencia/embed | Schema 768 | Composite |
|--------|-----|----------------|------------|-----------|
| **nomic-embed-text** | **768** | 6217 ms† | ✅ nativo | **85** |
| mxbai-embed-large | 1024 | 693 ms | ❌ requiere migración | 69 |

† Primera carga en frío; inferencias posteriores ~1–2 s en smoke RAG.

---

## ✅ Resultados del benchmark

**Ollama:** v0.31.2 en `http://127.0.0.1:11434` — OK

**Ganador LLM — `llama3.2:3b-instruct-q4_K_M`**
- Único modelo con **100/100** en español, razonamiento, tools y contexto
- JSON de herramientas válido sin markdown
- VRAM ~3.5 GB — margen cómodo en RTX 3050 (58% de 6 GB)
- Respuesta razonamiento: margen bruto **780€** correcto
- Email ventas B2B en español natural (España)

**Descartados:**
- **Phi-3 mini:** VRAM al 77% del total; falló tools (JSON corrupto con markdown/hallucination)
- **Qwen2.5 3B:** buen JSON tools pero razonamiento incorrecto (1890€ vs 780€)

**Ganador embeddings — `nomic-embed-text`**
- Dimensión **768** alineada con `local_ai_*` schema + índices ivfflat
- mxbai más rápido pero 1024 dim → migración innecesaria

**RAG real validado:** `scripts/local-ai-rag-smoke.ts` → OK  
- Ingest 1 chunk, búsqueda vectorial score **0.685**, recuperó `NELVYON-RAG-SMOKE-2026`

**Config aplicada:** `node scripts/local-ai-configure.mjs` → `backend/local-ai/.env.local`

---

## Configuración Ollama (automática)

```bash
OLLAMA_MODEL=llama3.2:3b-instruct-q4_K_M
LOCAL_AI_EMBEDDING_MODEL=nomic-embed-text
LOCAL_AI_EMBEDDING_DIM=768
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

Modelos descargados y retenidos: 3 LLM candidatos + 2 embeddings (para comparativa).  
Producción local usa solo los 2 ganadores.

---

## Comandos post-benchmark

```bash
node scripts/local-ai-configure.mjs
pnpm -C apps/web exec tsx ../../scripts/local-ai-health.ts
pnpm -C apps/web exec tsx ../../scripts/local-ai-rag-smoke.ts
```

---

## Pendiente (no iniciado)

- Router multi-modelo
- OpenClaw / MCP
- 22 agentes
- Benchmark LLM 7B (marginal — no recomendado en audit hardware)
