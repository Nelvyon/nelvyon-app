import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { createRequestLogger } from "@/lib/serverLogger";
import { REQUEST_ID_HEADER } from "@/lib/security/requestId";
import { OsAgentError } from "@nelvyon/os-agents";

import { FeedbackService } from "../../../../../../backend/feedback/FeedbackService";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const items = await FeedbackService.instance().getFeedback({ type, status });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.trim() || randomUUID();
  const log = createRequestLogger(requestId);
  log.info("feedback_submit_start", { requestId });
  try {
    const claims = await authenticate(req);
    const userLog = createRequestLogger(requestId, claims.userId);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      userLog.info("feedback_submit_end", { requestId, statusCode: 400 });
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      userLog.info("feedback_submit_end", { requestId, statusCode: 400 });
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }
    const o = body as Record<string, unknown>;
    const type = typeof o.type === "string" ? o.type : "";
    const title = typeof o.title === "string" ? o.title : "";
    const bodyText = typeof o.body === "string" ? o.body : "";
    const urlContext = typeof o.urlContext === "string" ? o.urlContext : undefined;

    const result = await FeedbackService.instance().submitFeedback(claims.userId, {
      type,
      title,
      body: bodyText,
      urlContext,
    });
    userLog.info("feedback_submit_end", { requestId, statusCode: 201, id: result.id });
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      log.info("feedback_submit_end", { requestId, statusCode: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && (e.message.includes("Invalid feedback") || e.message.includes("required"))) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
