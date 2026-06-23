import { NextResponse } from "next/server";
import {
  getLeadScoringService,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getLeadScoringService();
    const leads = await svc.getLeads(ctx.claims.userId ?? ctx.tenant.id);
    return NextResponse.json({ leads });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.name !== "string" || !b.name.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    if (typeof b.email !== "string" || !b.email.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });
    const svc = getLeadScoringService();
    const lead = await svc.saveLead(ctx.claims.userId ?? ctx.tenant.id, {
      name: b.name as string,
      email: b.email as string,
      company: typeof b.company === "string" ? b.company : undefined,
      source: typeof b.source === "string" ? b.source : "saas-form",
      industry: typeof b.industry === "string" ? b.industry : undefined,
      revenue: typeof b.revenue === "number" ? b.revenue : undefined,
      employees: typeof b.employees === "number" ? b.employees : undefined,
    });
    return NextResponse.json({ lead }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
