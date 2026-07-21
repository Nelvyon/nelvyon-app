import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasDeliverablesHubService,
  SaasDeliverablesHubError,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import { createLogger } from "@/lib/serverLogger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const log = createLogger("saas-entregables");

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
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { id } = await params;
    const body = (await req.json()) as { action?: string };
    const action = body.action;

    if (action !== "resend_portal_link" && action !== "open_in_portal") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Verify deliverable belongs to tenant (fail closed if missing)
    const svc = getSaasDeliverablesHubService();
    const deliverable = await svc.getDeliverable(ctx.tenant.id, id);

    log.info("entregables action not implemented", {
      tenantId: ctx.tenant.id,
      deliverableId: deliverable.id,
      action,
    });

    return NextResponse.json(
      {
        ok: false,
        code: "NOT_IMPLEMENTED",
        action,
        deliverableId: deliverable.id,
        error: "Portal link actions are not implemented yet",
      },
      { status: 501 },
    );
  } catch (e) {
    if (e instanceof SaasDeliverablesHubError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
