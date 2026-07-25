# ERP persistence restart smoke (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T14:40:35.945Z |
| Verdict | **ALL_PASS** |
| Base | https://ideal-victory-staging.up.railway.app |
| Tip SHA | `9e931f087897` (`/api/health/live`) |
| Deploy create | `86c93c8c` SUCCESS (mig apply) |
| Process recycle | redeploy `794662d7` SUCCESS (2026-07-25 16:37+02) — replaces soft `railway restart` (CLI hang) |
| Checkpoint supplierId | `b0a1a6aa-b001-4786-9dc2-638506651f6e` |
| Checkpoint name | ERP Persist Smoke 2026-07-25T14-04-52-495Z |
| Detail | supplier present after process recycle |
| SSOT row | `erp_domain_snapshots` tenant `4abc6641-5f4b-478f-ab8a-58a557f342fc` domain `purchases` version **3** · RLS **on** |
| `_migrations` | **519** + **520** present (staging) |

## Phases

1. `--phase=before` create supplier + checkpoint (pre-redeploy)
2. Railway redeploy (new container; old deployment REMOVING)
3. `--phase=after` GET list contains same supplierId/name → **ALL_PASS**

## Honesty

- Survival proven across **container recycle** (redeploy), not only soft restart.
- Payments / accounting remain **BLOCKED_SCOPE**.
- Multi-replica: designed via `FOR UPDATE` + optimistic version (HTTP 409); staging ran **single replica** — no second replica load test this session.
- Tenant A/B: unit cores + RLS enabled (**VERIFIED** unit); staging cross-tenant HTTP probe not re-run this session (same QA tenant).
- Prod: **no** migrate/activate without explicit CTO recommendation.
