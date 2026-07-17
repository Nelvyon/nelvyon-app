# PHASE 2 ELITE CERT — estado honesto

> **Veredicto actual: `PASS`** (`phase2EliteCertified: true`)  
> **Baseline anterior: `CONDITIONAL_PASS`**  
> Fecha evidencia: **2026-07-17**  
> Artefacto: `backend/local-ai/benchmarks/phase2_elite_certification.json` (schema v2)  
> Live: `backend/local-ai/benchmarks/phase2_elite_live.json`

## Comparación CONDITIONAL_PASS → PASS

| Criterio | Antes (CONDITIONAL) | Ahora (PASS) | Evidencia |
|----------|---------------------|--------------|-----------|
| Sandbox workflows 10/10 | ✅ | ✅ | `phase2Elite.test.ts` |
| Agent eval determinista | ✅ | ✅ | `agentEvalSuite` |
| Memory content security | ✅ | ✅ + live write/block | live report `memory` |
| OpenClaw mock | ✅ | ✅ | unchanged |
| Live Ollama workflows | ❌ no ejecutado | ✅ seo/support/crm | live JSON ~35–50s/wf |
| RAG index + retrieval | Solo presencia MD | ✅ hybrid P/R=1.0 (Ollama embeds) | `mode: ollama` |
| Tenant isolation RAG | Parcial | ✅ | `tenantIsolationOk` |
| Improvement promote/rollback | Propuestas | ✅ + CI gate wire | `controlledImprovement` |
| Elite gate en CI | No | ✅ `web-quality-gates.yml` | sandbox siempre |
| pgvector / Docker Local AI DB | N/A | ❌ residual KI-016 | no bloquea PASS repo |
| Mig 514 en staging/prod | Pendiente ops | Pendiente ops | no bloquea PASS repo |
| “Líder mundial” / prod ready | No reclamado | **No reclamado** | `notClaimed` |

## Qué significa este PASS

Certificación **Elite reproducible en repositorio** con:

1. Gates sandbox + freeze Router/MCP  
2. E2E live con Ollama (`llama3.1:8b-instruct-q4_K_M`)  
3. Shared Memory in-process (write + injection deny)  
4. RAG híbrido in-memory indexando corpus sintético con embeddings reales (`mxbai-embed-large`), precision/recall@k = 1.0, aislamiento tenant OK  

**No** significa: producción Railway lista, pgvector primary en DB validado, ni superioridad de mercado.

## Cómo reproducir

```powershell
# Sandbox / CI (típicamente CONDITIONAL_PASS sin Ollama live)
node scripts/run-phase2-elite-cert.mjs

# PASS completo (requiere Ollama local)
$env:NELVYON_ELITE_LIVE="1"
$env:OLLAMA_MODEL="llama3.1:8b-instruct-q4_K_M"
$env:LOCAL_AI_EMBEDDING_MODEL="mxbai-embed-large"
$env:LOCAL_AI_EMBEDDING_DIM="1024"
node scripts/run-phase2-elite-cert.mjs
```

## Residuales (documentados, no ocultan el PASS)

1. **KI-016** Docker Desktop — `LocalVectorStore`/pgvector no ejercitado en esta corrida  
2. Mig **514** + flags Memory en staging/prod — ops  
3. OpenClaw URL real — mock certificado; URL externa pendiente  
4. Workflows live = subconjunto representativo (3), no los 10 con LLM  

## Rollback de certificación

- Quitar `NELVYON_ELITE_LIVE` → harness vuelve a `CONDITIONAL_PASS` si live no corre  
- `NELVYON_RAG_PREFER_LOCAL=0` sigue siendo rollback del facade unificado (ILIKE adjunct)  
- Improvement loop: `rollbackImprovement(targetId)` restaura versión previa (no toca PromptRegistry prod)
