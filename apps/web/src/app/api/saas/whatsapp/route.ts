import { NextResponse } from "next/server";
import {
  getSaasWhatsAppService,
  SaasWhatsAppError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasWhatsAppError): NextResponse {
  const status = e.code === "NOT_CONFIGURED" ? 503 : e.code === "VALIDATION" ? 400 : 500;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET — config status + recent messages */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasWhatsAppService();
    const config = svc.getConfig();
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
    const messages = await svc.listMessages(ctx.tenant.id, { limit });
    return NextResponse.json({ whatsapp_configured: config.configured, from_number: config.fromNumber, messages });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST — send WhatsApp message */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json()) as { to: string; body: string; contactId?: string };
    const svc = getSaasWhatsAppService();
    const msg = await svc.send(ctx.tenant.id, {
      to: body.to,
      body: body.body,
      contactId: body.contactId ?? null,
    });
    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasWhatsAppError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
