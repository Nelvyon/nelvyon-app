# SERVICE — SEO

> SSOT capability: `seo` · `backend/agency/OsCapabilityRegistry.ts` · QA ≥ **85**

## Inputs
- Negocio, ciudad/sector, keywords objetivo, web actual (URL opcional)

## Outputs / entregables
- Brief SEO + mapa keywords
- Entregable pack (`NELVYON-SEO`) en portal `/portal`

## Kickoff
- Packs: `local-business-growth`, `saas-b2b-growth`
- Rutas: `/os/packs/local-growth`, `/os/packs/saas-b2b-growth`

## QA
- Umbral **85** (sin inflar)
- Auto-approve solo si QA ≥ 85

## LLM
- Ollama-first (ADR-034)
- OpenAI solo `AUTONOMOUS_ALLOW_OPENAI=1`

## CEO
- No requerido para generación; sí para publicar ads SEO de pago si aplica
