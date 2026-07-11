# PHASE 2 — Hardware Audit (NELVYON Private AI)

> **Auditoría real:** 2026-07-11 · Máquina propietario · **Sin descarga de modelos**

---

## Resumen

| Componente | Valor detectado |
|------------|-----------------|
| **OS** | Windows_NT 10.0.26200 x64 |
| **CPU** | AMD Ryzen 7 5700X — 8 cores / 16 threads @ 3.4 GHz |
| **RAM** | **32 GB** |
| **GPU** | NVIDIA GeForce RTX 3050 |
| **VRAM total** | **6144 MiB (~6 GB)** |
| **VRAM libre** | ~5270 MiB (al auditar) |
| **Driver NVIDIA** | 596.21 |
| **Compute capability** | 8.6 |
| **CUDA toolkit (nvcc)** | ❌ No instalado (inferencia vía Ollama/llama.cpp OK) |
| **Docker** | ✅ v29.6.1 (requiere Docker Desktop **en ejecución**) |
| **Disco libre (C:)** | ~820 GB |

Re-ejecutar: `node scripts/hardware-audit.mjs`

---

## Capacidad de inferencia (sin benchmarks aún)

| Escenario | Viabilidad | Notas |
|-----------|------------|-------|
| **3B–4B Q4** en GPU | ✅ Alta | Cabe en 6 GB VRAM con margen |
| **7B Q4_K_M** solo GPU | 🟡 Marginal | Puede requerir capas en CPU |
| **7B Q4** GPU + CPU offload | ✅ Viable | 32 GB RAM lo soportan |
| **13B+** | ❌ No recomendado | VRAM insuficiente |
| **Concurrencia** | 1–2 sesiones | Limitar workers en RTX 3050 |

---

## Modelos open-weight — comparativa preliminar (licencia comercial)

> **Benchmark ejecutado:** 2026-07-11 → `docs/PHASE2_BENCHMARK_RESULTS.md`

**Selección final:** `llama3.2:3b-instruct-q4_K_M` (LLM) · `nomic-embed-text` (768 dim)

| Familia | Licencia comercial | Tamaño recomendado | Fit hardware | Benchmark |
|---------|-------------------|-------------------|--------------|-----------|
| **Llama 3.2** | Llama Community License | 3B Instruct Q4 | ✅ Óptimo | **Ganador 81.5** |
| Phi-3 mini | MIT | 3.8B Q4 | 🟡 VRAM alta | 58.9 — tools fail |
| Qwen2.5 | Apache 2.0 | 3B Q4 | ✅ OK | 63.0 — reasoning fail |

---

## Runtime local

| Runtime | Estado | Notas |
|---------|--------|-------|
| **Ollama** | ✅ v0.31.2 · `llama3.2:3b-instruct-q4_K_M` + `nomic-embed-text` |
| **OpenClaw local** | Permitido en PRIVATE_MODE | vía `PRIVATE_MODE_ALLOWED_HOSTS=openclaw` |
| **MCP local** | Permitido | `http://localhost:*` en allowlist |

---

## Próximo paso propietario

1. Iniciar **Docker Desktop**
2. `node scripts/local-ai-up.mjs` → `node scripts/local-ai-migrate.mjs`
3. Instalar **Ollama** (sin pull masivo hasta benchmark)
4. Ejecutar benchmark corto sobre 3 candidatos 3B
5. Fijar `OLLAMA_MODEL` + `LOCAL_AI_EMBEDDING_MODEL` en `.env.local`
