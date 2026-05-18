import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const claims = await authenticate(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = 20;
    const offset = (page - 1) * limit;
    const sector = url.searchParams.get("sector") ?? null;

    const db = DbClient.getInstance();
    const whereClause = sector ? "WHERE user_id = $1 AND sector = $2" : "WHERE user_id = $1";
    const params = sector ? [claims.userId, sector, limit, offset] : [claims.userId, limit, offset];

    const rows = await db.query<{
      id: string;
      agent_id: string;
      sector: string;
      created_at: string;
    }>(
      `SELECT id, agent_id, sector, created_at
       FROM usage_events
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${sector ? 3 : 2} OFFSET $${sector ? 4 : 3}`,
      params,
    );

    const countRows = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM usage_events ${whereClause}`,
      sector ? [claims.userId, sector] : [claims.userId],
    );
    const total = parseInt(countRows[0]?.count ?? "0", 10);

    return NextResponse.json({
      items: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
