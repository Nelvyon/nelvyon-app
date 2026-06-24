import { NextResponse } from "next/server";
import {
  getSaasInboxService,
  SaasInboxError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type ConversationStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ conversationId: string }> };

function mapError(e: SaasInboxError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/inbox/[conversationId] — fetch single conversation */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const saasCtx = await requireSaasContext(req, "contacts.read");
    const { conversationId } = await ctx.params;
    const conversation = await getSaasInboxService().getConversation(saasCtx.tenant.id, conversationId);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ conversation });
  } catch (e: unknown) {
    if (e instanceof SaasInboxError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** PATCH /api/saas/inbox/[conversationId] — update status or assignedTo */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const saasCtx = await requireSaasContext(req, "contacts.write");
    const { conversationId } = await ctx.params;
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const conversation = await getSaasInboxService().updateConversation(saasCtx.tenant.id, conversationId, {
      status: typeof body.status === "string" ? (body.status as ConversationStatus) : undefined,
      assignedTo: body.assigned_to === null ? null : typeof body.assigned_to === "string" ? body.assigned_to : undefined,
    });
    return NextResponse.json({ conversation });
  } catch (e: unknown) {
    if (e instanceof SaasInboxError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
