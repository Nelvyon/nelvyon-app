# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización: **2026-07-11 18:05 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Fase 1 ops** | ⏳ Solo bloquea apelación SES AWS (CEO) |
| **Fase 2 IA local** | ✅ **Infra + Ollama + RAG real** — benchmark 2026-07-11 |
| **Último commit** | Phase 2 local stack validation |

---

## Fase 2 — IA privada local

**Validado (2026-07-11):**
- Infra Docker/pgvector/RLS/backup 7/7
- Ollama 0.31.2 + benchmark 3 LLM + 2 embeddings
- **Modelo producción:** `llama3.2:3b-instruct-q4_K_M`
- **Embeddings:** `nomic-embed-text` (768 dim)
- RAG smoke con embeddings reales OK

**Propietario debe (siguiente fase):**
1. **Router multi-modelo** + wiring agentes (no iniciado)
2. **No** construir 22 agentes hasta router validado

---

## Fase 1 — bloqueante restante

**SES Production Access** → `docs/SES_PRODUCTION_ACCESS_APPEAL.md` §3

---

## Comandos Fase 2

```bash
node scripts/hardware-audit.mjs
node scripts/local-ai-up.mjs
node scripts/local-ai-migrate.mjs
pnpm -C apps/web exec tsx ../../scripts/local-ai-health.ts
node scripts/local-ai-validate.mjs
node scripts/local-ai-benchmark.mjs
node scripts/local-ai-configure.mjs
pnpm -C apps/web exec tsx ../../scripts/local-ai-rag-smoke.ts
```

---

## Contexto

- IA local: `backend/local-ai/README.md`
- Privacidad: `docs/PHASE2_SECURITY_MODEL.md`
- SES appeal: `docs/SES_PRODUCTION_ACCESS_APPEAL.md`
