import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import {
  platformApiBase,
  readSessionToken,
  stableWorkspaceIdFromTenant,
} from "@/lib/platformFastApiProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * BFF entry for FastAPI OAuth providers (hubspot, slack, …).
 * Ads/meta/google/linkedin/tiktok use dedicated /api/oauth/* routes instead.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider")?.trim();
    if (!provider) {
      return NextResponse.json({ error: "provider required" }, { status: 400 });
    }

    const ctx = await requireSaasContext(req, "contacts.read");
    const token = await readSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? url.origin).replace(/\/$/, "");
    const redirectUri = `${appUrl}/api/saas/oauth/callback`;
    const workspaceId = stableWorkspaceIdFromTenant(ctx.tenant.id);

    const authRes = await fetch(
      `${platformApiBase()}/api/v1/oauth/authorize/${encodeURIComponent(provider)}?redirect_uri=${encodeURIComponent(redirectUri)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Workspace-Id": String(workspaceId),
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!authRes.ok) {
      const err = (await authRes.json().catch(() => ({}))) as { detail?: string };
      const msg = err.detail ?? `authorize_${authRes.status}`;
      return NextResponse.redirect(
        new URL(`/saas/integraciones?oauth_error=${encodeURIComponent(msg)}`, appUrl),
      );
    }

    const data = (await authRes.json()) as { authorize_url?: string };
    if (!data.authorize_url) {
      return NextResponse.redirect(
        new URL("/saas/integraciones?oauth_error=missing_authorize_url", appUrl),
      );
    }

    return NextResponse.redirect(data.authorize_url);
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
