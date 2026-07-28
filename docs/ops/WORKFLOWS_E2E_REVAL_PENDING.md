# Workflows E2E reval — CLOSED (staging CERTIFIED)

> Updated: 2026-07-28 · tip pending (post `3d7f4085`)

## Latest evidence

- File: `scripts/docs/evidence/os-saas-e2e/modules/saas.workflows_latest.json`
- Timestamp: 2026-07-28 (staging reval)
- Base URL: `https://ideal-victory-staging.up.railway.app`
- Decision: **CERTIFIED** (14 pass / 0 fail)

## Controlled repro (`wf.create`)

- Script: `scripts/repro-wf-create.mjs`
- Evidence: `saas.workflows.wf_create_repro_latest.json`
- Results: manual/active **201**, manual/draft **201**, `score_threshold` **201** (after mig **522**)

## Root cause (historical 2026-07-17 localhost FAIL)

| Finding | Detail |
|---------|--------|
| Cert payload `manual`+`active` | **PASS** on staging 2026-07-28 — July-17 localhost 500 **superseded** (stale env / opaque Internal error) |
| Real schema drift | API accepted `score_threshold` but DB CHECK (post-436) omitted it → CONSTRAINT until mig **522** |
| Fail-closed hardening | `mapWorkflowWriteError` maps 23514/23503/42P01 → `SaasWorkflowError`; `saasErrorBody` maps missing relation → `SCHEMA_MISMATCH` 503 |

## Migrations

| Mig | Staging | Prod |
|-----|---------|------|
| **521** sequence open/click cols | **applied** 2026-07-28T17:51Z | **NOT applied** (CEO gate ADR-064) |
| **522** score_threshold CHECK | **applied** 2026-07-28T17:56Z | **NOT applied** (CEO gate ADR-064) |

## Status

**CLOSED_STAGING** · prod apply + tip push/deploy still **BLOCKED_OPS / CEO**.
