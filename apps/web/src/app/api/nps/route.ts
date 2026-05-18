import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { createRequestLogger } from "@/lib/serverLogger";
import { REQUEST_ID_HEADER } from "@/lib/security/requestId";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../backend/db/DbClient";
import { FeedbackService } from "../../../../../../backend/feedback/FeedbackService";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(req: Request) {
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.trim() || randomUUID();
  const log = createRequestLogger(requestId);
  log.info("nps_show_check_start", { requestId });
  try {
    const claims = await authenticate(req);
    const userLog = createRequestLogger(requestId, claims.userId);
    const rows = await DbClient.getInstance().query<{ created_at: string }>(
      `SELECT created_at FROM nelvyon_users WHERE user_id = $1 LIMIT 1`,
      [claims.userId],
    );
    if (rows.length === 0) {
      userLog.info("nps_show_check_end", { requestId, show: false, reason: "user_not_found" });
      return NextResponse.json({ show: false });
    }
    const registeredAt = new Date(rows[0]!.created_at);
    const show = await FeedbackService.instance().shouldShowNps(claims.userId, registeredAt);
    userLog.info("nps_show_check_end", { requestId, show });
    return NextResponse.json({ show });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      log.info("nps_show_check_end", { requestId, statusCode: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function POST(req: Request) {
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.trim() || randomUUID();
  const log = createRequestLogger(requestId);
  log.info("nps_submit_start", { requestId });
  try {
    const claims = await authenticate(req);
    const userLog = createRequestLogger(requestId, claims.userId);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      userLog.info("nps_submit_end", { requestId, statusCode: 400 });
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      userLog.info("nps_submit_end", { requestId, statusCode: 400 });
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }
    const o = body as Record<string, unknown>;
    const score = typeof o.score === "number" ? o.score : Number(o.score);
    const comment = typeof o.comment === "string" ? o.comment : undefined;

    if (!Number.isFinite(score)) {
      userLog.info("nps_submit_end", { requestId, statusCode: 400 });
      return NextResponse.json({ error: "score is required" }, { status: 400 });
    }

    const result = await FeedbackService.instance().submitNps(claims.userId, score, comment);
    userLog.info("nps_submit_end", { requestId, statusCode: 201, category: result.category });
    return NextResponse.json({ category: result.category, id: result.id }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      log.info("nps_submit_end", { requestId, statusCode: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message.includes("NPS score")) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
