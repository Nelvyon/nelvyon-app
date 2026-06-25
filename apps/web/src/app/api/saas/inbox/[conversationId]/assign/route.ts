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

export async function POST(req: Request, ctx: Ctx) {
  try {
    const saasCtx = await requireSaasContext(req, "contacts.write");
    const { conversationId } = await ctx.params;
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const memberId = body.member_id === null ? null : typeof body.member_id === "string" ? body.member_id : null;
    const conversation = await getSaasInboxService().assignConversation(saasCtx.tenant.id, conversationId, memberId);
    return NextResponse.json({ conversation });
  } catch (e: unknown) {
    if (e instanceof SaasInboxError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
