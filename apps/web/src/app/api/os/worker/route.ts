import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { OsAgentError, OsQueueWorker, initOsQueueWorker } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(_req: Request): Promise<Response> {
  let claims;
  try {
    claims = await authenticate(_req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  if (claims.plan !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  initOsQueueWorker();
  return NextResponse.json(OsQueueWorker.getInstance().getStatus());
}
