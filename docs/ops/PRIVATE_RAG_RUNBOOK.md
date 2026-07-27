# Private Vector RAG — runbook (Block 24, actualizado "yellow point 7" 2026-07-25)

> **Estado:** núcleo sintético in-process **IMPLEMENTED_VERIFIED** · ruta productiva pgvector
> **IMPLEMENTED_VERIFIED** (re-verificada EN VIVO 2026-07-27 contra Railway staging + Ollama
> `nomic-embed-text`) — **VERDICT PASS** (críticos + calidad). Coste **0**. Sin OpenAI. Sin Pepito.
> Canary prod **OFF**. Fuente de verdad: `backend/local-ai/LocalRagRetriever.ts` ·
> Smoke: `scripts/staging-smoke-pgvector-rag-e2e.mjs` ·
> Evidencia: `scripts/docs/evidence/os-saas-e2e/modules/pgvector-rag.live_latest.md`

## Qué es esto (y qué NO es)

- **Es** un núcleo de recuperación vectorial *in-process*, sin Docker, que demuestra el
  contrato real de RAG: embeddings deterministas como `Float32Array`, similitud coseno
  geométrica real (no un "keyword match" disfrazado), aislamiento duro por tenant, y
  rechazo explícito cuando no hay evidencia.
- La ruta productiva pgvector (`backend/local-ai/LocalVectorStore.ts` +
  `backend/local-ai/LocalEmbeddingProvider.ts` + `backend/local-ai/LocalRagRetriever.ts`) fue
  **re-verificada EN VIVO el 2026-07-25** contra un contenedor Docker real
  (`nelvyon-local-ai-postgres`, `pgvector/pgvector:pg16`) y un Ollama real
  (`nomic-embed-text`, 768 dim) — no simulada. Se confirmaron en vivo: ingesta real
  (chunk → embed → insert), búsqueda coseno real sobre `vector(768)`, y aislamiento duro por
  tenant en **dos capas independientes** (filtro de aplicación + RLS de base de datos con rol
  no-superusuario `nelvyon_local_app`, `FORCE ROW LEVEL SECURITY`).
- **Calidad (ADR-070):** suelo corpus-aware en `LocalRagRetriever.resolveEffectiveRagMinScore`
  — **0.45** si `0 < activeChunkCount < 48`; corpus grande conserva **0.32** (nunca bajado).
  Staging e2e 2026-07-27: refuse unrelated default path **PASS** · related retrieval **PASS**.
  Gap P2 histórico cerrado (ver `docs/KNOWN_ISSUES.md` historial · ADR-057.1 hallazgo original).
- **Nota Railway:** e2e actual corre vía `railway run -e staging` + Ollama mesh; no requiere abrir canary prod.

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

## Contrato garantizado (verificado por tests) — núcleo sintético

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

## Contrato verificado EN VIVO — ruta productiva pgvector (2026-07-25)

| Propiedad | Verificado en vivo |
|-----------|---------------------|
| Embeddings reales (Ollama `nomic-embed-text`, 768-dim) | ✅ persistidos en columna `vector(768)` |
| Búsqueda coseno real (`embedding <=> query::vector`) | ✅ `LocalVectorStore.hybridSearch` contra pgvector real |
| Ingesta real (chunk → embed → insert) | ✅ `RagIngestPipeline.ingestFile` |
| Citas con procedencia real | ✅ `sourceId`+`documentId`+`chunkIndex`+`content`+`score` en cada cita |
| Aislamiento capa aplicación | ✅ tenant A nunca ve fuentes de tenant B en `LocalRagRetriever.retrieve` |
| Aislamiento capa base de datos (RLS) | ✅ sesión de tenant A obtiene 0 filas al pedir directamente el `document_id` de tenant B (rol `nelvyon_local_app`, `FORCE ROW LEVEL SECURITY`) |
| Rechazo con tenant vacío | ✅ 0 citas siempre para un tenant nunca ingerido |
| Rechazo con query irrelevante (corpus pequeño, `minScore` default) | ⚠️ **Gap P2 documentado** — ver `docs/KNOWN_ISSUES.md` |
| Rechazo con query irrelevante (`minScore=0.55`) | ✅ 0 citas — confirma que el gap es de calibración, no estructural |

Evidencia completa, reproducible con `node scripts/staging-smoke-pgvector-rag-e2e.mjs`
(requiere Docker `nelvyon-local-ai-postgres` levantado + Ollama con `nomic-embed-text` pulled):
`scripts/docs/evidence/os-saas-e2e/modules/pgvector-rag.live_latest.md`.

## Flags

| Flag | Efecto | Default |
|------|--------|---------|
| `NELVYON_PRIVATE_VECTOR_RAG_DISABLED` | Kill switch — toda `retrieve()` refuses (`rag_disabled`) | unset (RAG activo en el núcleo sintético) |

No hay flag de "activación productiva" en este módulo — es una librería pura in-process,
sin red, sin DB, sin coste. La ruta productiva pgvector se activa (cuando se re-verifique
en vivo) mediante la infraestructura ya existente en `backend/local-ai/` (Docker compose,
`LOCAL_AI_DATABASE_URL`, `OLLAMA_HOST`), no mediante este módulo.

## Cómo correr los smokes

```bash
# Núcleo sintético in-process (sin Docker, sin Ollama)
node scripts/staging-smoke-private-rag-synthetic.mjs

# Ruta productiva pgvector EN VIVO (requiere Docker nelvyon-local-ai-postgres + Ollama)
node scripts/local-ai-up.mjs            # si el contenedor no está corriendo
node scripts/local-ai-migrate.mjs       # idempotente — asegura extensión vector + esquema
node scripts/staging-smoke-pgvector-rag-e2e.mjs
```

Ambos escriben evidencia en `scripts/docs/evidence/os-saas-e2e/modules/` (`private-rag.synthetic_*`
y `pgvector-rag.live_*` respectivamente). El smoke pgvector real limpia sus propios tenants
sintéticos (`crypto.randomUUID()`, borrados en un bloque `finally`) — no deja estado persistente.
Si Docker/Ollama no están disponibles, el smoke escribe `BLOCKED_EXTERNAL` con el motivo exacto
en la evidencia — nunca reporta un PASS falso.

## Rollback

- `NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1` — refusal inmediato en cualquier entorno, sin
  redeploy (basta con setear la env var y reiniciar el proceso, o incluso en caliente si
  el proceso relee `process.env` en cada llamada, como hace este módulo).
- No hay estado persistente que limpiar en el núcleo sintético — vive en memoria del proceso.
- La ruta productiva pgvector no tiene flag de activación propio; se activa indirectamente
  vía `NELVYON_LOCAL_ROUTER_ENABLED` (bridge en `LocalModelRouterProvider`), que sigue en su
  valor de canary actual (staging: **SET** pero inferencia `BLOCKED_UNTIL_MESH`; prod: **ABSENT**)
  — ver `docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md`. Este trabajo no tocó ese flag.

## Nota de canary IA en staging (pgvector RAG) — NO activado

La verificación en vivo del 2026-07-25 se ejecutó **en la máquina local del owner**
(Docker Desktop + Ollama local), no contra Railway staging. Extender esta misma verificación
a staging requeriría, adicionalmente, ambas cosas (ninguna activada ni solicitada en esta sesión):

1. **Postgres+pgvector alcanzable desde el servicio Railway `ideal-victory`** —
   `LOCAL_AI_DATABASE_URL` apuntando a una instancia real (hoy no provisionada en staging).
2. **`OLLAMA_HOST` mesh (Tailscale Option A)** desde staging al Ollama del owner — ya
   documentado como **pendiente de aprobación CEO separada** en
   `docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md` (`NELVYON_LOCAL_ROUTER_ENABLED=1` ya está SET
   en staging, pero la inferencia real permanece `BLOCKED_UNTIL_MESH` — sin mesh, sin coste,
   sin OpenAI).

Hasta que ambas se aprueben y provisionen explícitamente, `private_vector_rag` en staging
permanece **PREPARED_OFF** (ver `docs/KNOWN_ISSUES.md`) aunque el core productivo ya esté
`IMPLEMENTED_VERIFIED` localmente.

## Próximo paso EXACTO

1. ✅ **Hecho (2026-07-25):** ruta productiva pgvector re-verificada en vivo contra Docker real +
   Ollama real, con evidencia committeada y `PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath`
   promovido a `IMPLEMENTED_VERIFIED`.
2. **Pendiente (P2, no bloqueante):** implementar un suelo de confianza consciente del tamaño
   del corpus en `LocalRagRetriever.retrieve` (subir `minScore` efectivo para tenants con pocos
   chunks ingeridos), re-benchmarkeado contra `backend/local-ai/benchmarks/specialization_eval_*.json`
   antes de cambiar el default compartido — tracked en `docs/KNOWN_ISSUES.md`.
3. **Pendiente (requiere aprobación CEO explícita, fuera de alcance de este trabajo):** si se
   decide llevar pgvector RAG a staging, aprobar y provisionar Postgres+pgvector accesible desde
   Railway + mesh Ollama (`docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md`).
