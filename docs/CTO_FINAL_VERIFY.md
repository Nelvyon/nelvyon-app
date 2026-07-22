# CTO Final Verify — 2026-07-22 (Automations 401 closed)

> Veredicto: **CONDITIONAL_READY** · `claimComplete` **false** · **no** READY (legal + IA CEO)  
> FastAPI deploy **`0460249e` SUCCESS** · tip `644a1556` · Coste **0**

## Automations 401 — causa y solución

| Paso | Evidencia |
|------|-----------|
| Causa | FastAPI `JWT_SECRET` ≠ web → `Invalid or expired authentication token` |
| Fix auth | Sync JWT_SECRET (ADR-038); keep `JWT_SECRET_KEY` native |
| Fix schema | mig **517** workspaces.* · mig **518** workflows.is_active+ |
| Fix runtime | FastAPI DB = web Postgres · `SKIP_ALEMBIC=1` · create_all duplicate ignore |
| BFF unified | **HTTP 200** · portal-packs PASS · no Unauthorized |

## Gates

| Gate | Resultado |
|------|-----------|
| live/ready | **200** / **200** |
| portal-packs | **ALL_PASS** |
| KI-020 | **KI020_PASS** |
| mig validate 508–518 | **OK** |
| IA flags | **OFF** · OpenAI key revoked |

## Pendientes externos

CEO mesh/canary IA · legal campañas · optional web git_sha restore
