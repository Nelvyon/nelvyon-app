import { NextResponse } from "next/server";
import { getSaasLmsService, SaasLmsError, saasErrorBody, saasErrorStatus, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasLmsError) {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

/** PATCH /api/saas/lms/modules/[id] */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { id } = await params;
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const mod = await getSaasLmsService().updateModule(ctx.tenant.id, id, {
      title: typeof b.title === "string" ? b.title : undefined,
      description: typeof b.description === "string" ? b.description : undefined,
    });
    return NextResponse.json({ module: mod });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** DELETE /api/saas/lms/modules/[id] */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { id } = await params;
    await getSaasLmsService().deleteModule(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
