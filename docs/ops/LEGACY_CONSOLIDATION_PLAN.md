# Legacy consolidation plan

Document-only audit — **no destructive deletes** performed or recommended.
Structured, tested inventory: `backend/agency/LegacyConsolidationAudit.ts`
(`backend/agency/__tests__/LegacyConsolidationAudit.test.ts`).

This plan is scoped to repo-wide legacy/duplication hygiene. It does **not**
replace the existing, separate `docs/archive/OS_LEGACY_DEPRECATION_PLAN.md`
(which covers `nelvyon_clients`/`nelvyon_projects` legacy OS entities and
their phased retirement) — that plan stays authoritative for that specific
scope.

---

## 1. `frontend/` — DO NOT TOUCH

- Legacy Vite SaaS shell, superseded by `apps/web` (Next.js 15).
- `frontend/DEPRECATED.md` already states: "Do not add new features here;
  port to `apps/web` instead."
- `CLAUDE.md` explicitly lists `frontend/` as legacy, "no tocar".
- **Action in this plan: none.** Not deleted, not modified, not audited for
  removal — CLAUDE.md's instruction is treated as a hard constraint, not a
  suggestion.

## 2. Alembic vs SQL — secondary, not SSOT

- **SSOT**: Node SQL migrations in `backend/db/migrations/*.sql`, applied in
  numeric order (latest in repo: `522_saas_workflows_score_threshold_trigger.sql`), per
  ADR-002/039. Prod verified `_migrations` tip: 517+518
  (`docs/DATABASE.md`).
- **Secondary**: `backend/alembic/versions/` (23 versions, Python/FastAPI).
  FastAPI prod runs with `SKIP_ALEMBIC=1` — Alembic never creates schema in
  prod; `create_all`'s `is_duplicate_table_error` guard only swallows
  "relation already exists" errors caused by the SQL SSOT having already
  created the table.
- **Gate**: `scripts/validate-sql-alembic-ssot.mjs` already enforces this
  relationship (files + optional DB probe).
- **Action in this plan: none** — this is already correctly documented and
  gated; re-stated here only for the consolidated audit view.

## 3. `pages/api/saas/*` — deprecated, HTTP 410

- `apps/web/src/pages/api/saas/_deprecated.ts` implements `deprecatedRoute()`,
  returning `410 Gone` with a `migration` hint pointing at the real
  App-Router endpoint (`apps/web/src/app/api/saas/*`).
- `CLAUDE.md` explicitly forbids modifying these routes even though they are
  inert (`410` is the intended, permanent behavior — it signals "moved", not
  "temporarily broken").
- **Action in this plan: none** — verified the routes still return `410` by
  reading `_deprecated.ts`; no code path re-enables them.

## 4. Duplicate paths — audited, none found

- `git status` at the start of this session appeared to list a few
  `apps/web/src/app/api/saas/*` paths twice (once with `/`, once with `\`
  separators — e.g. `.../mcp/route.ts`). Verified on disk: **exactly one
  file** exists at each such path. This is a Windows `git status` rendering
  artifact for newly-added untracked directories, not a duplicated committed
  file or a real path collision.
- No other duplicate implementation paths (e.g. two competing services for
  the same SaaS feature) were found in this audit's scope. If a future audit
  finds a real duplicate, it must be recorded here with the specific paths
  and a proposed (human-reviewed) consolidation — never a silent delete.

## Consolidation principles (applies to any future work in this area)

1. **Document before deleting.** Any removal candidate gets an entry in this
   plan (or a follow-up doc) with evidence it is unused, before any deletion
   PR is opened.
2. **Zero production risk bias.** When in doubt, leave it and document —
   consolidation debt is cheaper than an outage from removing something
   still depended upon.
3. **Never touch `frontend/` or `backend/alembic/`** as part of "cleanup"
   work without an explicit, separate, CEO-approved decision to retire one of
   them outright (not covered by this plan).

## Evidence

- `backend/agency/LegacyConsolidationAudit.ts` + its test suite is the
  structured, machine-checkable version of sections 1–4 above.
- `assertLegacyConsolidationAuditIntegrity()` fails if any entry is ever
  marked `safeToDelete: true`, or if `frontend`/`alembic`/`pages/api` drift
  away from their documented statuses.
