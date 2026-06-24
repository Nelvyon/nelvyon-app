import { NextResponse } from "next/server";
import {
  getSaasInboxService,
  SaasInboxError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ conversationId: string }> };

function mapError(e: SaasInboxError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET — list messages for a conversation */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const saasCtx = await requireSaasContext(req, "contacts.read");
    const { conversationId } = await ctx.params;
    const messages = await getSaasInboxService().listMessages(saasCtx.tenant.id, conversationId);
    return NextResponse.json({ messages });
  } catch (e: unknown) {
    if (e instanceof SaasInboxError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/**
 * POST — reply to a conversation (channel-aware dispatch).
 *
 * body: { body: string, direction?: "inbound"|"outbound" }
 *
 * For direction="outbound" (default): dispatches via SMS or WhatsApp when
 * contact phone is available; stores message regardless of dispatch result.
 * For direction="inbound": stores only (simulates inbound message).
 */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const saasCtx = await requireSaasContext(req, "contacts.write");
    const { conversationId } = await ctx.params;
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const msgBody = typeof body.body === "string" ? body.body : "";
    const direction = body.direction === "inbound" ? "inbound" : "outbound";

    if (direction === "inbound") {
      const message = await getSaasInboxService().sendMessage(saasCtx.tenant.id, conversationId, {
        body: msgBody,
        direction: "inbound",
      });
      return NextResponse.json({ message, channel_dispatched: false }, { status: 201 });
    }

    const result = await getSaasInboxService().replyToConversation(saasCtx.tenant.id, conversationId, msgBody);
    return NextResponse.json({
      message: result.message,
      channel_dispatched: result.channelDispatched,
      channel_error: result.channelError ?? null,
    }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasInboxError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
