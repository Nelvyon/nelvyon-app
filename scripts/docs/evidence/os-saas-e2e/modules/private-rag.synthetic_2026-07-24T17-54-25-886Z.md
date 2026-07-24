# Private Vector RAG — synthetic in-process certification

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-24T17:54:25.886Z |
| Staging base | https://ideal-victory-staging.up.railway.app |
| Health check | PASS |
| Vitest `PrivateVectorRagCore.test.ts` | PASS |
| Synthetic core status | **IMPLEMENTED_VERIFIED** — real cosine retrieval, hard tenant isolation, refuse-on-no-evidence |
| Production pgvector path status | **PREPARED_OFF** — not exercised live in this session (requires Docker) |
| Pepito DB | nunca referenciada — solo tenants sintéticos A/B |
| Tenant isolation | assertTenantIsolation() + cross-tenant retrieve tests — 0 leakage |
| Refuse-on-no-evidence | verificado: tenant vacío, query irrelevante, kill switch — todos refusan |

## Rollback / kill switch

```
NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1  # kill switch — every retrieve() refuses fail-closed
# --- no productive activation flag exists in this module; production pgvector path is
# --- PREPARED_OFF (backend/local-ai/) until re-verified live against a real Docker instance ---
```

## Próximo paso EXACTO para promover a IMPLEMENTED_VERIFIED productivo

1. Levantar Docker local-ai (`node scripts/local-ai-up.mjs`) y confirmar Ollama embeddings.
2. Ejecutar un test de integración real contra `LocalVectorStore.hybridSearch` con los
   mismos asserts de aislamiento tenant A/B que este suite usa en memoria.
3. Actualizar `PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath` solo entonces.
