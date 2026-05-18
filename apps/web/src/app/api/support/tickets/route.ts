import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { createRequestLogger } from "@/lib/serverLogger";
import { REQUEST_ID_HEADER } from "@/lib/security/requestId";
import { OsAgentError } from "@nelvyon/os-agents";

import { SupportService } from "../../../../../../../backend/support/SupportService";

export const runtime = "nodejs";

const CATEGORIES = new Set(["billing", "technical", "feature_request", "other"]);

export async function GET(req: Request) {
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.trim() || randomUUID();
  const log = createRequestLogger(requestId);
  log.info("support_tickets_list_start", { requestId });
  try {
    const claims = await authenticate(req);
    const userLog = createRequestLogger(requestId, claims.userId);
    const tickets = await SupportService.instance().getTickets(claims.userId);
    userLog.info("support_tickets_list_end", { requestId, count: tickets.length });
    return NextResponse.json({ tickets });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      log.info("support_tickets_list_end", { requestId, statusCode: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function POST(req: Request) {
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.trim() || randomUUID();
  const log = createRequestLogger(requestId);
  log.info("support_ticket_create_start", { requestId });
  try {
    const claims = await authenticate(req);
    const userLog = createRequestLogger(requestId, claims.userId);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      userLog.info("support_ticket_create_end", { requestId, statusCode: 400 });
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      userLog.info("support_ticket_create_end", { requestId, statusCode: 400 });
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }
    const o = body as Record<string, unknown>;
    const subject = typeof o.subject === "string" ? o.subject.trim() : "";
    const bodyText = typeof o.body === "string" ? o.body.trim() : "";
    const category = typeof o.category === "string" ? o.category.trim() : "";
    const priority = typeof o.priority === "string" ? o.priority.trim() : undefined;
    const templateId = typeof o.templateId === "string" ? o.templateId.trim() : undefined;

    if (subject.length === 0 || bodyText.length === 0) {
      userLog.info("support_ticket_create_end", { requestId, statusCode: 400 });
      return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
    }
    if (!CATEGORIES.has(category)) {
      userLog.info("support_ticket_create_end", { requestId, statusCode: 400 });
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const result = await SupportService.instance().createTicket(claims.userId, {
      subject,
      body: bodyText,
      category,
      priority,
      templateId,
    });
    userLog.info("support_ticket_create_end", { requestId, statusCode: 201, ticketId: result.ticketId });
    return NextResponse.json(
      { ticketId: result.ticketId, autoResponse: result.autoResponse },
      { status: 201 },
    );
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      log.info("support_ticket_create_end", { requestId, statusCode: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
