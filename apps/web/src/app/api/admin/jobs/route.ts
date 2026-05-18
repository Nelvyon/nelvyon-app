import { NextResponse } from "next/server";

import { getNelvyonAdminService } from "@nelvyon/admin";
import { OsAgentError } from "@nelvyon/os-agents";
import { assertAdmin } from "../_utils";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await assertAdmin(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const serviceId = url.searchParams.get("serviceId") ?? undefined;
    const tenantId = url.searchParams.get("tenantId") ?? undefined;
    const jobs = await getNelvyonAdminService().getJobs({ status, serviceId, tenantId });
    return NextResponse.json({ jobs });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof OsAgentError && e.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
}
