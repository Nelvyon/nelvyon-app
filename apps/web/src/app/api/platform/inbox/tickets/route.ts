import { NextResponse } from "next/server";

import { EMPTY_CLIENT_LIST, proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMPTY_TICKETS = { ...EMPTY_CLIENT_LIST };

/** Same-origin helpdesk tickets list — graceful empty list when FastAPI is unavailable. */
export async function GET(req: Request) {
  try {
    await authenticate(req);
    const upstream = await proxyPlatformFetch(req, "GET", "/api/v1/entities/helpdesk_tickets");

    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }
    if (upstream.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (upstream.status === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(EMPTY_TICKETS);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(EMPTY_TICKETS);
  }
}
