# Private Vector RAG — runbook (Block 24)

> **Estado:** núcleo sintético in-process **IMPLEMENTED_VERIFIED** · ruta productiva pgvector **PREPARED_OFF**
> (no re-verificada en vivo en esta sesión, requiere Docker). Coste **0**. Sin OpenAI. Sin Pepito.
> Fuente de verdad en código: `backend/agency/PrivateVectorRagCore.ts` ·
> Tests: `backend/agency/__tests__/PrivateVectorRagCore.test.ts` ·
> Smoke: `scripts/staging-smoke-private-rag-synthetic.mjs`

## Qué es esto (y qué NO es)

- **Es** un núcleo de recuperación vectorial *in-process*, sin Docker, que demuestra el
  contrato real de RAG: embeddings deterministas como `Float32Array`, similitud coseno
  geométrica real (no un "keyword match" disfrazado), aislamiento duro por tenant, y
  rechazo explícito cuando no hay evidencia.
- **No** sustituye la ruta productiva pgvector (`backend/local-ai/LocalVectorStore.ts`
  + `backend/local-ai/LocalEmbeddingProvider.ts` + `backend/local-ai/LocalRagRetriever.ts`),
  que sigue existiendo en el repo, usa Ollama para embeddings reales y Postgres+pgvector
  para el índice. Esa ruta **no se ejecutó en vivo** en esta sesión (requiere el contenedor
  Docker `nelvyon-local-ai-postgres` arriba) — su estado honesto es `PREPARED_OFF`, no
  `IMPLEMENTED_VERIFIED`.

## Por qué "hashing-trick" y no un fake por keywords

`hashEmbed(text)` implementa la técnica *hashing vectorizer* (la misma familia que usa
`HashingVectorizer` de scikit-learn): cada token (y bigrama) se hashea de forma
determinista a un bucket de un vector de dimensión fija, con signo pseudo-aleatorio, y el
vector final se normaliza L2. Esto produce una representación vectorial real:

- Mismo texto → mismo vector (determinista, verificado en tests).
- La similitud coseno entre dos vectores es un producto punto genuino sobre vectores
  normalizados — **no** un `includes()` de substring.
- Textos que comparten vocabulario quedan geométricamente más cerca; textos sin relación
  quedan lejos. Verificado con casos "relacionado" vs "no relacionado" en el test suite.

Esto es suficiente para certificar el **contrato** de RAG (ranking geométrico, topK,
citas, rechazo por falta de evidencia, aislamiento por tenant) sin depender de Ollama ni
de Postgres+pgvector en este entorno.

## Contrato garantizado (verificado por tests)

| Propiedad | Verificado |
|-----------|------------|
| Embeddings deterministas (`Float32Array`) | ✅ `hashEmbed` mismo input → mismo output |
| Similitud coseno geométrica real | ✅ self-similarity = 1, textos relacionados > no relacionados |
| Ingesta por tenant sintético A/B | ✅ `PrivateVectorRagCore.ingest` |
| Recuperación con `topK` y citas | ✅ `retrieve()` devuelve `PrivateRagCitation[]` ordenadas por score |
| Rechazo si no hay evidencia | ✅ `refused: true, refusalReason: "no_evidence_found"` cuando no hay match ≥ `minScore` |
| Aislamiento duro tenant A/B | ✅ `assertTenantIsolation()` + tests que fuerzan queries cross-tenant y comprueban 0 resultados |
| Kill switch | ✅ `NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1` fuerza refusal en toda llamada |
| Observabilidad | ✅ `getMetrics()` — ingests, retrievals, refusals por motivo, checks de aislamiento |

## Flags

| Flag | Efecto | Default |
|------|--------|---------|
| `NELVYON_PRIVATE_VECTOR_RAG_DISABLED` | Kill switch — toda `retrieve()` refuses (`rag_disabled`) | unset (RAG activo en el núcleo sintético) |

No hay flag de "activación productiva" en este módulo — es una librería pura in-process,
sin red, sin DB, sin coste. La ruta productiva pgvector se activa (cuando se re-verifique
en vivo) mediante la infraestructura ya existente en `backend/local-ai/` (Docker compose,
`LOCAL_AI_DATABASE_URL`, `OLLAMA_HOST`), no mediante este módulo.

## Cómo correr el smoke

```bash
node scripts/staging-smoke-private-rag-synthetic.mjs
```

Esto ejecuta el suite vitest de `PrivateVectorRagCore.test.ts` y escribe evidencia en
`scripts/docs/evidence/os-saas-e2e/modules/`.

## Rollback

- `NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1` — refusal inmediato en cualquier entorno, sin
  redeploy (basta con setear la env var y reiniciar el proceso, o incluso en caliente si
  el proceso relee `process.env` en cada llamada, como hace este módulo).
- No hay estado persistente que limpiar — el núcleo vive en memoria del proceso.

## Próximo paso EXACTO (si se decide avanzar a producción)

1. Levantar el stack Docker local-ai (`node scripts/local-ai-up.mjs`) y verificar
   `LocalEmbeddingProvider.isAvailable()` contra un Ollama real.
2. Ejecutar un test de integración real contra pgvector (`LocalVectorStore.hybridSearch`)
   con datos sintéticos A/B, replicando exactamente los mismos asserts de aislamiento que
   `PrivateVectorRagCore.test.ts` usa en memoria.
3. Solo entonces actualizar `PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath` de
   `PREPARED_OFF` a `IMPLEMENTED_VERIFIED` en `backend/agency/PrivateVectorRagCore.ts`,
   con el commit de evidencia (log del test de integración) referenciado en el mismo diff.
