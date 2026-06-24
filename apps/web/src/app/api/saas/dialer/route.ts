import { NextResponse } from "next/server";
import {
  getSaasDialerService,
  SaasDialerError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasDialerError): NextResponse {
  const status = e.code === "NOT_CONFIGURED" ? 503 : e.code === "VALIDATION" ? 400 : 502;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET — dialer config + recent calls */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasDialerService();
    const config = svc.getConfig();
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
    const contactId = url.searchParams.get("contactId") ?? undefined;
    const calls = await svc.listCalls(ctx.tenant.id, { limit, contactId });
    return NextResponse.json({
      dialer_configured: config.configured,
      from_number: config.fromNumber,
      calls,
    });
  } catch (e: unknown) {
    if (e instanceof SaasDialerError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST — initiate a call */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const to = typeof b.to === "string" ? b.to.trim() : "";
    if (!to) return NextResponse.json({ error: "to is required" }, { status: 400 });
    const svc = getSaasDialerService();
    const call = await svc.initiateCall(ctx.tenant.id, {
      to,
      message: typeof b.message === "string" ? b.message : undefined,
      contactId: typeof b.contactId === "string" ? b.contactId : null,
    });
    return NextResponse.json(call, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasDialerError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
