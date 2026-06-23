import { NextResponse } from "next/server";
import {
  getSaasSmsService,
  SaasSmsError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasSmsError): NextResponse {
  const status = e.code === "NOT_CONFIGURED" ? 503 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET — returns Twilio config status (no secrets exposed) */
export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    const status = getSaasSmsService().getStatus();
    return NextResponse.json({ sms_configured: status.configured, from_number: status.fromNumber });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST — send single SMS or bulk */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    const svc = getSaasSmsService();

    if (Array.isArray(b.recipients)) {
      const recipients = (b.recipients as unknown[]).filter((r): r is string => typeof r === "string");
      const message = typeof b.message === "string" ? b.message : "";
      const result = await svc.sendBulk(ctx.tenant.id, recipients, message);
      return NextResponse.json(result);
    }

    if (typeof b.to === "string" && typeof b.message === "string") {
      const result = await svc.send(ctx.tenant.id, b.to, b.message);
      return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    }

    return NextResponse.json({ error: "Provide {to, message} or {recipients[], message}" }, { status: 400 });
  } catch (e: unknown) {
    if (e instanceof SaasSmsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
