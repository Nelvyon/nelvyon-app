import { NextResponse } from "next/server";

import {
  getSaasDashboardLayoutService,
  SaasDashboardLayoutError,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  type DashboardLayout,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasDashboardLayoutError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const layout = await getSaasDashboardLayoutService().getLayout(ctx.tenant.id);
    return NextResponse.json({ layout });
  } catch (e: unknown) {
    if (e instanceof SaasDashboardLayoutError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json()) as { layout?: DashboardLayout };
    if (!body.layout) {
      return NextResponse.json({ error: "layout required" }, { status: 400 });
    }
    const layout = await getSaasDashboardLayoutService().updateLayout(ctx.tenant.id, body.layout);
    return NextResponse.json({ layout });
  } catch (e: unknown) {
    if (e instanceof SaasDashboardLayoutError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
