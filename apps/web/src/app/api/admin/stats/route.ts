import { NextResponse } from "next/server";

import { getNelvyonAdminService } from "@nelvyon/admin";
import { OsAgentError } from "@nelvyon/os-agents";
import { assertAdmin } from "../_utils";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await assertAdmin(req);
    const stats = await getNelvyonAdminService().getSystemStats();
    return NextResponse.json({ stats });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof OsAgentError && e.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
}
