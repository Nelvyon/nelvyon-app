/**
 * Incoming webhook endpoint — triggers workflow with trigger_type=webhook_in.
 * Authenticated with JWT (requireSaasContext). Accepts any JSON payload.
 * Source name comes from query param ?source= for discriminating between multiple senders.
 * Idempotency: Idempotency-Key / x-idempotency-key (process-local, 15m TTL).
 */
import { NextResponse } from "next/server";
import {
  requireSaasContext,
  requestIdFrom,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import { dispatchWebhookIn } from "../../../../../../../../backend/saas/saasWorkflowDispatch";
import {
  claimWebhookInIdempotency,
} from "../../../../../../../../backend/saas/webhookInIdempotency";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.execute");
    const requestId = requestIdFrom(req);
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") ?? "default";

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const idem =
      req.headers.get("idempotency-key")?.trim() ||
      req.headers.get("x-idempotency-key")?.trim() ||
      (typeof payload.idempotencyKey === "string" ? payload.idempotencyKey.trim() : "");

    if (idem) {
      const prior = claimWebhookInIdempotency(ctx.tenant.id, source, idem);
      if (prior) {
        return NextResponse.json({
          ok: true,
          source,
          duplicate: true,
          received: prior,
          ...(requestId ? { requestId } : {}),
        });
      }
    }

    // Fire-and-forget — acknowledge after idempotency claim, then dispatch
    void dispatchWebhookIn(ctx.tenant.id, source, payload);

    return NextResponse.json({
      ok: true,
      source,
      duplicate: false,
      received: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e, { requestId: requestIdFrom(req) }), {
      status: saasErrorStatus(e),
    });
  }
}
