import { NextResponse } from "next/server";

import {
  getSaasInboxAgentService,
  requireSaasContext,
  SaasInboxAgentError,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ conversationId: string }> };

/** POST — AI suggest reply for conversation (Nelvyon agent skills) */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const saasCtx = await requireSaasContext(req, "contacts.write");
    const { conversationId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { inboundBody?: string };
    const result = await getSaasInboxAgentService().suggestReply(
      saasCtx.tenant.id,
      conversationId,
      body.inboundBody,
    );
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof SaasInboxAgentError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "DISABLED" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
