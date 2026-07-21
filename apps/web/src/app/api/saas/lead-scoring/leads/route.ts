import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

/**
 * Legacy dual-stack lead scoring — REMOVED from write/read surface.
 *
 * SSOT: `GET/POST /api/saas/lead-scoring` → `SaasLeadScoringService`
 * (tenant CRM rules/scores on saas_contacts).
 *
 * This route returns 410 Gone so two scoring systems cannot diverge.
 * See docs/DECISIONS.md ADR-023 and docs/KNOWN_ISSUES.md KI-015.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GONE = {
  error: "gone",
  code: "LEAD_SCORING_LEGACY_GONE",
  message:
    "Legacy /api/saas/lead-scoring/leads is removed. Use /api/saas/lead-scoring (SaasLeadScoringService).",
  ssot: "/api/saas/lead-scoring",
};

async function gone(req: Request) {
  try {
    // Still require auth so unauthenticated probes get 401, not a free 410 info leak pattern for scanners that ignore bodies.
    await requireSaasContext(req, "contacts.read");
    return NextResponse.json(GONE, { status: 410 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const PATCH = gone;
export const DELETE = gone;
