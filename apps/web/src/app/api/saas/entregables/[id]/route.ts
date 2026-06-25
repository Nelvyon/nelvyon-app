import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasDeliverablesHubService,
  SaasDeliverablesHubError,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { id } = await params;
    const svc = getSaasDeliverablesHubService();
    const deliverable = await svc.getDeliverable(ctx.tenant.id, id);
    return NextResponse.json({ deliverable });
  } catch (e) {
    if (e instanceof SaasDeliverablesHubError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[entregables/[id] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { id } = await params;
    const body = (await req.json()) as { action?: string };
    const action = body.action;

    if (action !== "resend_portal_link" && action !== "open_in_portal") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Verify deliverable belongs to tenant
    const svc = getSaasDeliverablesHubService();
    const deliverable = await svc.getDeliverable(ctx.tenant.id, id);

    // Audit log (non-fatal) — noop but logged
    console.info(`[entregables action] tenant=${ctx.tenant.id} id=${id} action=${action}`);

    return NextResponse.json({
      ok: true,
      action,
      deliverableId: deliverable.id,
    });
  } catch (e) {
    if (e instanceof SaasDeliverablesHubError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[entregables/[id] POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
