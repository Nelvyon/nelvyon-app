# OS Autonomous Production — Runbook

> Activate `AUTONOMOUS_PRODUCTION=true` only after this gate passes.  
> Any skipped step = the flag stays off.

---

## What the flag does

Setting `AUTONOMOUS_PRODUCTION=true` in Railway unlocks `publishProductionDeliverables` inside `runGrowthPack`.  
Without it the orchestrator throws:

```
publishProductionDeliverables requiere AUTONOMOUS_PRODUCTION=true.
Activa la bandera solo tras validar el gate de producción.
```

This prevents staging or local pack runs from accidentally publishing deliverables to real clients.

---

## Gate — run before every activation

```bash
# Requires a running dev server (or staging URL)
BASE_URL=https://YOUR_STAGING_URL CRON_SECRET=$CRON_SECRET \
  node scripts/run-os-autonomous-gate.mjs
```

The gate checks:

| # | Check | Pass condition |
|---|---|---|
| 1 | Visual QA brand contrast | `#0084ff / #020817` → WCAG AA ≥ 4.5 |
| 2 | Pack kickoff API reachability | HTTP 200/400/401/422 for all 3 pack IDs |
| 3 | OS recurring services cron | HTTP 200/401 from `/api/cron/os-recurring-services` |

Exit 0 → all pass. Exit 1 → one or more failed → do NOT activate.

---

## Activation procedure

1. Run all P0 smokes: `node scripts/run-staging-p0-smokes.mjs`
2. Run the autonomous gate: `node scripts/run-os-autonomous-gate.mjs --base-url https://staging.nelvyon.com`
3. Both must exit 0.
4. In Railway → Variables → add `AUTONOMOUS_PRODUCTION=true`
5. Trigger a redeploy (or Railway auto-deploys on variable change).
6. Verify first pack run completes with `published: true` in the pack run logs.

---

## Rollback

1. Remove `AUTONOMOUS_PRODUCTION` from Railway variables (or set to `false`).
2. Railway auto-deploys.
3. Pack runs continue but `publishProductionDeliverables` has no effect.
4. Review deliverables that were published during the window — revert manually if needed.

---

## CI gate (optional)

`.github/workflows/os-gate.yml` runs `run-os-autonomous-gate.mjs` against a live staging URL on every push to `main`.  
It is marked `continue-on-error: true` so CI does not block merges — it only alerts.

The gate job is skipped if `BASE_URL` is not set (prevents false failures in forks without staging).

---

## Key files

| File | Purpose |
|---|---|
| `apps/web/src/lib/packs/packOrchestrator.ts` | `isAutonomousProductionEnabled()` + guard in `runGrowthPack` |
| `scripts/run-os-autonomous-gate.mjs` | Gate runner |
| `.github/workflows/os-gate.yml` | CI alerting job |
| `backend/autonomous/qa/visualQaEngine.ts` | WCAG contrast + legal QA |
