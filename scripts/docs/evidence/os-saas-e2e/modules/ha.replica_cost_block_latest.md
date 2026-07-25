# Multi-replica without cost — evidence

> Fecha: 2026-07-25 · staging `ideal-victory`

## Finding

| Check | Result |
|-------|--------|
| Current `numReplicas` (service manifest) | **1** (sfo) |
| CLI | `railway scale [REGION=REPLICAS]` exists |
| Free 2nd replica | **Not evidenced** — Railway usage billing scales with replicas/resources; no zero-cost guarantee |
| Action taken | **None** — did **not** call `railway scale …=2` |

## Equivalent verification (no cost)

| Test | Result |
|------|--------|
| ERP HTTP concurrency / stock / reserve | **ALL_PASS** (`erp.concurrency_latest.md`) |
| Snapshot `FOR UPDATE` + optimistic version | Designed for multi-replica app against shared Postgres |
| Sticky-session-free | App is stateless JWT/cookie + Postgres SSOT when `DATABASE_URL` set |

## Verdict

**BLOCKED_EXTERNAL / COST** — second Railway replica not activated.  
Do not claim multi-region or HA worldwide.  
`claimReady: false`
