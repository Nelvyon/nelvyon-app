# Legacy consolidation audit — Block 23

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T11:27:23.000Z |
| SSOT | `backend/agency/LegacyConsolidationAudit.ts` |
| Tests | `backend/agency/__tests__/LegacyConsolidationAudit.test.ts` |
| Plan doc | `docs/ops/LEGACY_CONSOLIDATION_PLAN.md` |
| Unsafe deletes recommended | **0** |
| Status | **IMPLEMENTED_VERIFIED (audit)** |

## Integrity assertion

`assertLegacyConsolidationAuditIntegrity()` → **ok: true**, violations: `[]`

## Inventory (zero `safeToDelete: true`)

| id | path | status | safeToDelete |
|----|------|--------|--------------|
| `frontend_legacy_vite` | `frontend/` | **DO_NOT_TOUCH** | false |
| `alembic_secondary` | `backend/alembic/` | SECONDARY_NOT_SSOT | false |
| `pages_api_saas_410` | `apps/web/src/pages/api/saas/` | DEPRECATED_410 | false |
| `duplicate_paths_git_status` | `apps/web/src/app/api/saas/*` | AUDIT_ONLY | false |

## DO_NOT_TOUCH list

1. **`frontend/`** — legacy Vite SaaS shell. Superseded by `apps/web` (Next.js 15). CLAUDE.md and `frontend/DEPRECATED.md` forbid adding features or deleting this tree. **Never delete in this audit.**

## Asserted non-delete zones (also `safeToDelete: false`)

- **`backend/alembic/`** — secondary Python migrations; Node SQL (`backend/db/migrations/*.sql`) remains SSOT.
- **`apps/web/src/pages/api/saas/*`** — HTTP 410 via `deprecatedRoute()`; App Router is the real API. CLAUDE.md forbids modifying these routes.
- **Windows `git status` slash duplicates** — display artifact only; not real duplicated files; no action.

## Honestidad

- This module is **document-only**. It does not perform or recommend destructive deletes.
- Deletion decisions require a separate, explicit, human-reviewed change outside this audit.
- OS-entity deprecation (`nelvyon_clients` / projects) is covered separately by `docs/archive/OS_LEGACY_DEPRECATION_PLAN.md` and is **not** replaced here.
