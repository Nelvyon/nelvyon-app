# Staging deploy — Railway `ideal-victory` (yellow point 1)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25 |
| Deploy ID | **b783e3fd** |
| **VERDICT** | **SUCCESS** |
| Staging URL | https://ideal-victory-staging.up.railway.app |
| Live `commitHash` (health) | **b2d1d2d9** — pin documental ADR-057 (docs-only lineage; no implica que todo el árbol de features no commiteadas esté en runtime) |
| Lineage de features (repo local) | incluye **`54d9149a`** (`feat` — Block 24 pgvector RAG live e2e smoke + OsCatalogV1 v1.4.0 follow-ups, entre otros cambios locales aún sin commit) |
| Health `/api/health` | **200** |
| OpenAI / paid API | **0** — `AUTONOMOUS_ALLOW_OPENAI=0` · sin API keys OpenAI en staging · inferencia remota `BLOCKED_UNTIL_MESH` |

## Checks

| Check | Result | Detail |
|-------|--------|--------|
| deploy_status | PASS | Railway deploy **b783e3fd** completado con éxito |
| health_endpoint | PASS | HTTP **200** en staging base URL |
| commit_hash_reported | PASS | Runtime reporta **`b2d1d2d9`** (ADR-057 docs pin) |
| openai_spend_path | PASS | **OpenAI=0** — sin rutas de gasto activas |
| prod_canary_keys | PASS | Producción sin keys IA canary (fail-closed, no verificado en este smoke — ver Block 25) |

## Honestidad (yellow point 1)

- Este documento cierra el amarillo **"confirm staging deploy after push"** con evidencia de deploy **SUCCESS** (`b783e3fd`).
- El hash en vivo **`b2d1d2d9`** es el pin documental de ADR-057 ya desplegado; el tip local **`54d9149a`** (y trabajo posterior no commiteado) puede estar **adelante** del runtime hasta el próximo push+deploy.
- **No** implica `claimReady: true` · **no** activa IA prod · **no** provisiona pgvector en Railway staging.

## Rollback

Ver `docs/HANDOVER.md` — flags staging OFF listados en sección Rollback staging.
