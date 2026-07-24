/**
 * Legacy consolidation audit — structured, document-only inventory.
 * No destructive deletes performed or recommended by this module; `frontend/`
 * and `backend/alembic/` are never touched. See
 * `docs/ops/LEGACY_CONSOLIDATION_PLAN.md` for the full narrative and
 * `docs/archive/OS_LEGACY_DEPRECATION_PLAN.md` for the separate, existing
 * OS-entity (nelvyon_clients/projects) deprecation plan this does not replace.
 */

export type LegacyAreaStatus = "DO_NOT_TOUCH" | "SECONDARY_NOT_SSOT" | "DEPRECATED_410" | "AUDIT_ONLY";

export type LegacyAreaEntry = {
  id: string;
  title: string;
  path: string;
  status: LegacyAreaStatus;
  rationale: string;
  /** Always false in this audit — deletion decisions require a separate, explicit, human-reviewed change. */
  safeToDelete: boolean;
  docPath: string;
};

export const LEGACY_CONSOLIDATION_DOC_PATH = "docs/ops/LEGACY_CONSOLIDATION_PLAN.md";

export const LEGACY_AREAS: readonly LegacyAreaEntry[] = [
  {
    id: "frontend_legacy_vite",
    title: "frontend/ (legacy Vite SaaS shell)",
    path: "frontend/",
    status: "DO_NOT_TOUCH",
    rationale:
      "Superseded by apps/web (Next.js 15). CLAUDE.md and frontend/DEPRECATED.md explicitly forbid adding features or deleting this tree.",
    safeToDelete: false,
    docPath: LEGACY_CONSOLIDATION_DOC_PATH,
  },
  {
    id: "alembic_secondary",
    title: "backend/alembic/ (Python migrations, secondary)",
    path: "backend/alembic/",
    status: "SECONDARY_NOT_SSOT",
    rationale:
      "Node SQL migrations (backend/db/migrations/*.sql, up to 518) remain SSOT per ADR-002/039; FastAPI prod runs with SKIP_ALEMBIC=1. Alembic's 23 versions are historical/secondary and never replace numbered SQL migrations.",
    safeToDelete: false,
    docPath: "docs/DATABASE.md",
  },
  {
    id: "pages_api_saas_410",
    title: "apps/web/src/pages/api/saas/* (legacy Pages Router, HTTP 410)",
    path: "apps/web/src/pages/api/saas/",
    status: "DEPRECATED_410",
    rationale:
      "All routes return HTTP 410 via deprecatedRoute() — the real API surface lives in apps/web/src/app/api/saas/* (App Router). CLAUDE.md forbids modifying these routes even though they are inert.",
    safeToDelete: false,
    docPath: "apps/web/src/pages/api/saas/_deprecated.ts",
  },
  {
    id: "duplicate_paths_git_status",
    title: "Git status duplicate-looking untracked paths (audited, not real duplicates)",
    path: "apps/web/src/app/api/saas/*",
    status: "AUDIT_ONLY",
    rationale:
      "`git status` occasionally renders the same untracked file twice with forward vs back slashes on Windows (e.g. apps/web/.../mcp/route.ts). Verified on disk: exactly one file exists at each such path — this is a display artifact, not a duplicated committed file, and required no action.",
    safeToDelete: false,
    docPath: LEGACY_CONSOLIDATION_DOC_PATH,
  },
] as const;

export function listLegacyAreas(): LegacyAreaEntry[] {
  return [...LEGACY_AREAS];
}

export function getLegacyArea(id: string): LegacyAreaEntry | undefined {
  return LEGACY_AREAS.find((a) => a.id === id);
}

export function assertLegacyConsolidationAuditIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const area of LEGACY_AREAS) {
    if (area.safeToDelete) violations.push(`must_never_be_safe_to_delete_in_this_audit:${area.id}`);
    if (!area.rationale || area.rationale.length < 20) violations.push(`missing_or_short_rationale:${area.id}`);
    if (!area.docPath) violations.push(`missing_doc_path:${area.id}`);
  }

  const frontend = getLegacyArea("frontend_legacy_vite");
  if (!frontend || frontend.status !== "DO_NOT_TOUCH") violations.push("frontend_must_be_do_not_touch");

  const alembic = getLegacyArea("alembic_secondary");
  if (!alembic || alembic.status !== "SECONDARY_NOT_SSOT") violations.push("alembic_must_be_secondary_not_ssot");

  const pagesApi = getLegacyArea("pages_api_saas_410");
  if (!pagesApi || pagesApi.status !== "DEPRECATED_410") violations.push("pages_api_saas_must_be_410");

  return { ok: violations.length === 0, violations };
}
