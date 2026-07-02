export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

import {
  getSaasAttributionService,
  isPgMissingRelation,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

const EMPTY_SUMMARY = {
  totalVisits: 0,
  totalFormSubmits: 0,
  totalConversions: 0,
  totalContacts: 0,
  topSource: null as string | null,
};

/** GET /api/saas/attribution — multi-touch attribution summary (alias for reportes tab). */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") ?? "30");
    const summary = await getSaasAttributionService().getSummary(ctx.tenant.id, days);
    return NextResponse.json({ summary });
  } catch (e: unknown) {
    if (isPgMissingRelation(e)) {
      return NextResponse.json({ summary: EMPTY_SUMMARY, schemaPending: true });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
