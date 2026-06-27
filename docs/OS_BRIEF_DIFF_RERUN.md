# OS Brief Diff & Re-run (O29)

When a client **changes the brief** after a pack run, OS computes a structured
**before/after intake diff**, persists it, and can **re-execute the full pack**
(new `pack_run`) linked to the source — without an operator.

## Material vs cosmetic fields

`MATERIAL_INTAKE_FIELDS`: `business_name`, `sector`, `value_proposition`,
`primary_cta`, `city`, `website_url`, `tier`. A diff touching any of these sets
`material=true`. Other fields (e.g. `country`) still appear in `diff[]` but do
not alone mark material.

## Flow

1. `compare({ sourcePackRunId, newIntake })` — loads `nelvyon_pack_runs.intake`,
   merges patch, diffs, INSERT `os_brief_diff_runs` with status `compared` or
   `no_change`.
2. `executeRerun(diffId, runner)` — calls the pack `RUNNERS` entry with
   `after_intake`; sets `new_pack_run_id`, status `completed` or `failed`.
3. `compareAndRerun` — one-shot compare + optional execute.

## Relation to other modules

- **S49 Brief-to-Launch** — SaaS launch flow; O29 is OS-native diff/rerun from an
  existing pack run (S49 hook deferred v1).
- **O28 Agent Audit Trail** — each re-run generates a new audit trail for the new
  `pack_run_id`.
- **Kickoff** — re-run uses the same `RUNNERS` map as `/api/os/packs/[packId]/kickoff`.

## APIs

- `GET /api/os/brief-diff` → `{ summary, diffs[] }`
- `GET /api/os/brief-diff/[id]` → `{ diff }`
- `POST /api/os/brief-diff/compare` → `{ diff }` (compare only, `execute: false` implicit)
- `POST /api/os/brief-diff/rerun` → compare + rerun (`execute` default true)
- `POST /api/os/brief-diff/[id]/rerun` → rerun existing diff record

Dashboard: `/os/brief-diff`.

## v1 scope

- Intake-level diff only (not deliverable HTML diff).
- Does not cancel or mutate the source pack run.
