# Workflows E2E reval — BLOCKED_OPS

> Updated: 2026-07-28

## Latest evidence

- File: `scripts/docs/evidence/os-saas-e2e/modules/saas.workflows_latest.json`
- Timestamp: `2026-07-17T11:09:22.942Z`
- Decision: **FAIL** (12 pass / 1 fail / 13 flows)

## Failing flow

| Flow | Status | Error |
|------|--------|-------|
| `wf.create` | 500 | `{"error":"Internal error"}` |

All other flows in the cert passed (`wf.meta`, `wf.list_a`, `wf.isolation`, `wf.ses_flag_present`, `wf.401`, onboard/register paths).

## Local code assessment

- `POST /api/saas/workflows` route validates input and delegates to `SaasWorkflowService.createWorkflow`.
- Unit/integration coverage exists and passes:
  - `backend/saas/__tests__/saasWorkflows.test.ts` — `API POST /api/saas/workflows → 201 con datos válidos`
  - `SaasWorkflowService.createWorkflow` suite (jsonb serialization, draft status, validation)
- No reproducible local code defect found for the July-17 HTTP live failure without a running Postgres + full `registerAndOnboard` stack.

## Likely cause (ops / environment)

1. **Stale live cert** — evidence is 11 days old; local dev DB may have been missing migrations or had transient state at capture time.
2. **Opaque 500** — `saasErrorBody` maps unknown DB/driver errors to `Internal error`; server logs would show the underlying message (`[saasErrorBody]`).
3. **Not a unit-test gap** — service + route mocks pass; failure is HTTP-live only.

## Unblock steps (ops)

1. Ensure migrations through `518_workflows_list_columns.sql` applied on target DB.
2. Re-run workflows module cert:
   ```bash
   node scripts/run-yellow-queue-drain.mjs
   ```
   (or targeted workflows section if script supports filter)
3. If `wf.create` still 500, inspect app logs for `[saasErrorBody]` at POST time and capture SQL error code.
4. Refresh `saas.workflows_latest.json` + `saas.workflows.md` evidence headers.

## Status

**BLOCKED_OPS** — code path covered by vitest; HTTP live re-run required to close FAIL.
