import { NextResponse } from "next/server";
import {
  getSaasAdsDashboardService,
  SaasAdsDashboardError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type AdsPlatform,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasAdsDashboardError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "NOT_CONNECTED" ? 422 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET — status (all platforms) OR metrics (with platform + date_start + date_end) */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform") as AdsPlatform | null;
    const dateStart = searchParams.get("date_start");
    const dateEnd = searchParams.get("date_end");

    if (platform && dateStart && dateEnd) {
      const metrics = await getSaasAdsDashboardService().getMetrics(ctx.tenant.id, platform, dateStart, dateEnd);
      return NextResponse.json({ metrics });
    }

    const status = await getSaasAdsDashboardService().getStatus(ctx.tenant.id);
    return NextResponse.json({ status });
  } catch (e: unknown) {
    if (e instanceof SaasAdsDashboardError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST — connect account or disconnect */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    if (b.action === "disconnect" && typeof b.id === "string") {
      await getSaasAdsDashboardService().disconnectAccount(ctx.tenant.id, b.id);
      return NextResponse.json({ ok: true });
    }

    const connection = await getSaasAdsDashboardService().connectAccount(ctx.tenant.id, {
      platform: b.platform as AdsPlatform,
      accountId: typeof b.account_id === "string" ? b.account_id : "",
      accountName: typeof b.account_name === "string" ? b.account_name : "",
      accessToken: typeof b.access_token === "string" ? b.access_token : "",
      refreshToken: typeof b.refresh_token === "string" ? b.refresh_token : undefined,
      tokenExpiresAt: typeof b.token_expires_at === "string" ? b.token_expires_at : undefined,
      extraConfig: typeof b.extra_config === "object" && b.extra_config ? b.extra_config as Record<string, unknown> : undefined,
    });
    return NextResponse.json({ connection }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasAdsDashboardError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
