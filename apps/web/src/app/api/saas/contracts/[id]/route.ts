import { type NextRequest, NextResponse } from "next/server";
import { getSaasCpqEnterpriseService, SaasCpqEnterpriseError, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { id } = await params;
    const contract = await getSaasCpqEnterpriseService().getContract(ctx.tenant.id, id);
    return NextResponse.json({ contract });
  } catch (e) {
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    if ((e as { status?: number }).status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { id } = await params;
    const body = await req.json() as { action?: string };
    const svc = getSaasCpqEnterpriseService();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    let result;
    if (body.action === "send") {
      result = await svc.sendContract(ctx.tenant.id, id, baseUrl);
    } else if (body.action === "cancel") {
      await svc.cancelContract(ctx.tenant.id, id);
      result = { ok: true };
    } else if (body.action === "renew") {
      result = await svc.renewContract(ctx.tenant.id, id);
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    if ((e as { status?: number }).status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
