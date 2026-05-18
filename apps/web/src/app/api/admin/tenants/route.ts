import { NextResponse } from "next/server";

import { getNelvyonAdminService } from "@nelvyon/admin";
import { OsAgentError } from "@nelvyon/os-agents";
import { assertAdmin } from "../_utils";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await assertAdmin(req);
    const url = new URL(req.url);
    const planRaw = url.searchParams.get("plan") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const plan = planRaw === "starter" || planRaw === "pro" || planRaw === "enterprise" ? planRaw : undefined;
    const tenants = await getNelvyonAdminService().getTenants({ plan, search });
    return NextResponse.json({ tenants });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof OsAgentError && e.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
}
