import { NextResponse } from "next/server";

import {
  getSaasCrmService,
  requireSaasContext,
  SaasCrmError,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const crm = getSaasCrmService();
    const pipeline = await crm.getPipelineSummary(ctx.tenant.id);
    return NextResponse.json({ pipeline });
  } catch (e: unknown) {
    if (e instanceof SaasCrmError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
