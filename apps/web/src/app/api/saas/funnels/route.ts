import { NextResponse } from "next/server";
import {
  getSaasFunnelService,
  SaasFunnelError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type CreateFunnelInput,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasFunnelError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "VALIDATION" ? 400 : 500;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET — list funnels for tenant */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const funnels = await getSaasFunnelService().list(ctx.tenant.id);
    // Return in shape compatible with UI: steps flattened to count + analytics
    const mapped = funnels.map(f => ({
      id: f.id,
      name: f.name,
      description: f.description,
      status: f.status,
      steps: f.steps.map(s => ({
        id: s.id,
        type: s.type,
        name: s.name,
        visitors: s.visitors,
        conversions: s.conversions,
      })),
      totalVisitors: f.totalVisitors,
      totalConversions: f.totalConversions,
      revenue: 0,
      createdAt: f.createdAt,
    }));
    return NextResponse.json({ funnels: mapped });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST — create funnel */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json()) as unknown as CreateFunnelInput;
    const funnel = await getSaasFunnelService().create(ctx.tenant.id, body);
    return NextResponse.json({ funnel }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasFunnelError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
