# ERP persistence restart smoke (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T14:40:35.945Z |
| Verdict | **ALL_PASS** |
| Base | https://ideal-victory-staging.up.railway.app |
| Checkpoint supplierId | `b0a1a6aa-b001-4786-9dc2-638506651f6e` |
| Checkpoint name | ERP Persist Smoke 2026-07-25T14-04-52-495Z |
| Detail | supplier present after restart |
| SSOT | `erp_domain_snapshots` (mig 520) via `withPurchasesPersistence` |

## Honesty

- Restart is orchestrated by parent (Railway); this script only asserts survival.
- Payments / accounting remain **BLOCKED_SCOPE**.
- Without DATABASE_URL + mig 520 applied, after-restart assert is expected to FAIL.
