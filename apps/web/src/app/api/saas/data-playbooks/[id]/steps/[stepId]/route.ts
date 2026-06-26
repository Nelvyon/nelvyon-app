import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasDataPlaybooksService,
  SaasDataPlaybooksError,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const { id, stepId } = await params;
    const body = (await req.json().catch(() => ({}))) as { completed?: boolean };
    if (body.completed !== true) {
      return NextResponse.json({ error: "completed:true requerido", code: "VALIDATION" }, { status: 400 });
    }
    const svc = getSaasDataPlaybooksService();
    const step = await svc.completeStep(ctx.tenant.id, id, stepId);
    return NextResponse.json({ step });
  } catch (e) {
    if (e instanceof SaasDataPlaybooksError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[data-playbooks/[id]/steps/[stepId] PATCH]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
