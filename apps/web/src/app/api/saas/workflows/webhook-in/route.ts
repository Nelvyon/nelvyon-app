/**
 * Incoming webhook endpoint — triggers workflow with trigger_type=webhook_in.
 * Authenticated with JWT (requireSaasContext). Accepts any JSON payload.
 * Source name comes from query param ?source= for discriminating between multiple senders.
 */
import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import { dispatchWebhookIn } from "../../../../../../../../backend/saas/saasWorkflowDispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.execute");
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") ?? "default";

    const payload = await req.json().catch(() => ({})) as Record<string, unknown>;

    // Fire-and-forget — acknowledge immediately, then dispatch
    void dispatchWebhookIn(ctx.tenant.id, source, payload);

    return NextResponse.json({ ok: true, source, received: new Date().toISOString() });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
