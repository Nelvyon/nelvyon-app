import { NextResponse } from "next/server";

import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import {
  EMPTY_SOCIAL_MONITORING,
  EMPTY_SOCIAL_PUBLISH,
  EMPTY_SOCIAL_SCHEDULER,
  EMPTY_UNIFIED_SOCIAL,
  mergeUnifiedSocial,
} from "@/lib/socialBffRoute";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CLIENT_ID = "ws-client-1";

async function safeJson(res: Response, fallback: unknown) {
  if (!res.ok) return fallback;
  try {
    return await res.json();
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(EMPTY_UNIFIED_SOCIAL);
  }
  if (claims instanceof NextResponse) return claims;

  try {
    const [schedulerRes, monitoringRes, publishRes] = await Promise.all([
      proxyPlatformFetch(req, "GET", "/api/social/stats/overview"),
      proxyPlatformFetch(req, "GET", "/api/social-monitoring/dashboard"),
      proxyPlatformFetch(req, "GET", `/api/social-publish/analytics/${CLIENT_ID}`),
    ]);

    const scheduler = (await safeJson(schedulerRes, EMPTY_SOCIAL_SCHEDULER)) as typeof EMPTY_SOCIAL_SCHEDULER;
    const monitoring = (await safeJson(monitoringRes, EMPTY_SOCIAL_MONITORING)) as typeof EMPTY_SOCIAL_MONITORING;
    const autoPublish = (await safeJson(publishRes, EMPTY_SOCIAL_PUBLISH)) as typeof EMPTY_SOCIAL_PUBLISH;

    if (
      !schedulerRes.ok &&
      !monitoringRes.ok &&
      !publishRes.ok &&
      upstreamFailed(schedulerRes.status)
    ) {
      return NextResponse.json(EMPTY_UNIFIED_SOCIAL);
    }

    return NextResponse.json(mergeUnifiedSocial(scheduler, monitoring, autoPublish));
  } catch {
    return NextResponse.json(EMPTY_UNIFIED_SOCIAL);
  }
}
