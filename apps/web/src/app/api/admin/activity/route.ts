import { NextResponse } from "next/server";

import { getNelvyonAdminService } from "@nelvyon/admin";
import { OsAgentError } from "@nelvyon/os-agents";
import { assertAdmin } from "../_utils";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await assertAdmin(req);
    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitParam) ? limitParam : 20;
    const activity = await getNelvyonAdminService().getRecentActivity(limit);
    return NextResponse.json({ activity });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof OsAgentError && e.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
}
