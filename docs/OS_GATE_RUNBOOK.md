# OS Pack Gate — Runbook (O22)

The OS pack gate guarantees all 8 packs (3 growth + 5 beta) stay shippable: their
fixtures validate against the real runners and the OS QA suite is green.

## When it runs

| Trigger | Workflow | Blocking? |
|---|---|---|
| push to `main` / PR touching `apps/web`, `backend/saas`, `backend/os-agents`, `backend/autonomous`, `scripts` | `.github/workflows/os-pack-gate.yml` | **YES — blocks merge** |
| manual / nightly staging | `.github/workflows/os-gate.yml` | No (advisory, needs `STAGING_BASE_URL`) |
| manual local | `node scripts/run-os-pack-gate.mjs` | exit code (0/1) |
| platform admin UI | `POST /api/os/gate/run` → `/os/gate` | records audit run |

The blocking gate needs **neither** `DATABASE_URL` nor `STAGING_BASE_URL` — it runs
vitest suites that assert the 8 fixtures validate + QA thresholds hold.

## Interpreting GATE_FAIL

`scripts/run-os-pack-gate.mjs` prints `ALL_GATE_PASS` (exit 0) or `GATE_FAIL` (exit 1).
On failure, inspect which suite failed:

- `packCertification.o17.test.ts` → a pack fixture no longer validates against its
  runner (a `validate*Intake` changed required fields, or a pack id drifted).
- `visualQaEngine.test.ts` / `OsVisualQaGateService.o18.test.ts` → QA scoring/gate
  thresholds regressed.
- `OsPackGateService.o22.test.ts` → gate orchestration regressed.

## Re-certify a pack

```bash
# via API (platform admin)
POST /api/os/packs/certifications/run   { "packId": "ecommerce-growth" }
# or run all 8
POST /api/os/packs/certifications/run   {}
```
Dashboard: `/os/packs/certifications`. A pack is promotable to `available` only with
a fresh (<90d) passing certification (`POST /api/os/packs/certifications/promote`).

## Staging smokes P0 (manual, needs STAGING + secrets)

`node scripts/run-staging-p0-smokes.mjs` now covers portal + the 3 growth packs
end-to-end (`local-pack`, `ecommerce-pack-e2e`, `saas-b2b-pack-e2e`). Run before a
production deploy or after infra changes. Requires `STAGING_BASE_URL` + platform token.

## AUTONOMOUS_PRODUCTION=true checklist

1. `node scripts/run-os-pack-gate.mjs` → `ALL_GATE_PASS`.
2. `node scripts/run-os-autonomous-gate.mjs --base-url <staging>` → all checks pass
   (visual QA, 8 pack kickoff routes, recurring cron).
3. `/os/gate` shows 8/8 packs certified + last gate `passed`.
4. Only then set `AUTONOMOUS_PRODUCTION=true` in Railway.

## Rollback if gate red in prod

1. Revert the offending commit (`git revert <sha>`) — the blocking gate prevents
   most red merges, so a red prod gate usually means an env/data drift.
2. Set `AUTONOMOUS_PRODUCTION=false` to stop autonomous publishing.
3. Re-run `POST /api/os/packs/certifications/run {}` to identify the failing pack.
4. Fix forward; the next push re-runs `os-pack-gate.yml`.
