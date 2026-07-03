export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasGeoVisibilityReportService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const runs = await getSaasGeoVisibilityReportService().listRuns(ctx.tenant.id);
    return NextResponse.json({ runs });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json()) as { domain?: string };
    const domain = String(body.domain ?? "").trim();
    if (!domain) {
      const { DbClient } = await import("../../../../../../../backend/db/DbClient");
      const rows = await DbClient.getInstance().query<{ website: string | null }>(
        `SELECT website FROM saas_tenants WHERE id = $1 LIMIT 1`,
        [ctx.tenant.id],
      );
      const fromTenant = rows[0]?.website?.trim() ?? "";
      if (!fromTenant) {
        return NextResponse.json({ error: "domain required" }, { status: 400 });
      }
      const run = await getSaasGeoVisibilityReportService().analyze(ctx.tenant.id, fromTenant);
      return NextResponse.json({ run }, { status: 201 });
    }
    const run = await getSaasGeoVisibilityReportService().analyze(ctx.tenant.id, domain);
    return NextResponse.json({ run }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
