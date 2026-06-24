export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasLeadScoringService,
  SaasLeadScoringError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type CreateRuleInput,
  type SaasLeadCategory,
} from "@nelvyon/saas";

function mapErr(e: SaasLeadScoringError): NextResponse {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

/** GET /api/saas/lead-scoring
 *  ?resource=rules  → list rules
 *  ?resource=scores → list scored leads (optional &category=hot|warm|cold)
 *  ?resource=max-score → sum of positive active rules
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const resource = searchParams.get("resource") ?? "rules";
    const svc = getSaasLeadScoringService();

    if (resource === "scores") {
      const category = searchParams.get("category") as SaasLeadCategory | null;
      const scores = await svc.listScores(ctx.tenant.id, { category: category ?? undefined });
      return NextResponse.json({ scores });
    }

    if (resource === "max-score") {
      const max = await svc.getMaxPossibleScore(ctx.tenant.id);
      return NextResponse.json({ max });
    }

    // default: rules
    const rules = await svc.listRules(ctx.tenant.id);
    return NextResponse.json({ rules });
  } catch (e: unknown) {
    if (e instanceof SaasLeadScoringError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/lead-scoring
 *  action = update-rule | delete-rule | score-contact
 *  default → create rule
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const b = await req.json() as Record<string, unknown>;
    const action = String(b.action ?? "");
    const svc = getSaasLeadScoringService();

    if (action === "update-rule") {
      const rule = await svc.updateRule(ctx.tenant.id, String(b.id ?? ""), {
        name:     b.name     ? String(b.name)               : undefined,
        points:   b.points   !== undefined ? Number(b.points)   : undefined,
        active:   b.active   !== undefined ? Boolean(b.active)  : undefined,
        value:    b.value    !== undefined ? String(b.value)    : undefined,
        operator: b.operator ? String(b.operator) as "equals" | "greater_than" : undefined,
      });
      return NextResponse.json({ rule });
    }

    if (action === "delete-rule") {
      await svc.deleteRule(ctx.tenant.id, String(b.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    if (action === "score-contact") {
      const score = await svc.scoreContact(ctx.tenant.id, String(b.contactId ?? ""));
      return NextResponse.json({ score });
    }

    // default: create rule
    const rule = await svc.createRule(ctx.tenant.id, b as unknown as CreateRuleInput);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasLeadScoringError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
