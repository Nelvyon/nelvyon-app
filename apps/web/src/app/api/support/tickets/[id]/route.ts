import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { createRequestLogger } from "@/lib/serverLogger";
import { REQUEST_ID_HEADER } from "@/lib/security/requestId";
import { OsAgentError } from "@nelvyon/os-agents";

import { SupportService } from "../../../../../../../../backend/support/SupportService";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.trim() || randomUUID();
  const { id } = await ctx.params;
  const log = createRequestLogger(requestId);
  log.info("support_ticket_get_start", { requestId, ticketId: id });
  try {
    const claims = await authenticate(req);
    const userLog = createRequestLogger(requestId, claims.userId);
    const ticket = await SupportService.instance().getTicket(claims.userId, id);
    if (!ticket) {
      userLog.info("support_ticket_get_end", { requestId, ticketId: id, statusCode: 404 });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    userLog.info("support_ticket_get_end", { requestId, ticketId: id, statusCode: 200 });
    return NextResponse.json({ ticket });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      log.info("support_ticket_get_end", { requestId, statusCode: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.trim() || randomUUID();
  const { id } = await ctx.params;
  const log = createRequestLogger(requestId);
  log.info("support_ticket_close_start", { requestId, ticketId: id });
  try {
    const claims = await authenticate(req);
    const userLog = createRequestLogger(requestId, claims.userId);
    await SupportService.instance().closeTicket(claims.userId, id);
    userLog.info("support_ticket_close_end", { requestId, ticketId: id, statusCode: 204 });
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      log.info("support_ticket_close_end", { requestId, statusCode: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
