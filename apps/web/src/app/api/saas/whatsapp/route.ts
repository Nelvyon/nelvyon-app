import { NextResponse } from "next/server";
import {
  getSaasWhatsAppService,
  getSaasWhatsAppCloudService,
  isMetaWaConfigured,
  SaasWhatsAppError,
  SaasWhatsAppCloudError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasWhatsAppError | SaasWhatsAppCloudError): NextResponse {
  const status = e.code === "NOT_CONFIGURED" ? 503 : e.code === "VALIDATION" ? 400 : 500;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET — config status + recent messages */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

    if (isMetaWaConfigured()) {
      const svc = getSaasWhatsAppCloudService();
      const config = svc.getConfig();
      const messages = await svc.listMessages(ctx.tenant.id, { limit });
      return NextResponse.json({
        whatsapp_configured: config.configured,
        provider: "meta",
        phone_number_id: config.phoneNumberId,
        from_number: null,
        messages,
      });
    }

    // Twilio fallback
    const svc = getSaasWhatsAppService();
    const config = svc.getConfig();
    const messages = await svc.listMessages(ctx.tenant.id, { limit });
    return NextResponse.json({
      whatsapp_configured: config.configured,
      provider: config.configured ? "twilio" : null,
      from_number: config.fromNumber,
      phone_number_id: null,
      messages,
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST — send WhatsApp message (Cloud API first, Twilio fallback) */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json()) as {
      to: string;
      body: string;
      contactId?: string;
      templateName?: string;
      templateLanguage?: string;
    };

    if (isMetaWaConfigured()) {
      const svc = getSaasWhatsAppCloudService();
      const msg = await svc.send(ctx.tenant.id, {
        to: body.to,
        body: body.body,
        contactId: body.contactId ?? null,
        templateName: body.templateName,
        templateLanguage: body.templateLanguage,
      });
      return NextResponse.json({ message: msg, provider: "meta" }, { status: 201 });
    }

    // Twilio fallback
    const svc = getSaasWhatsAppService();
    const msg = await svc.send(ctx.tenant.id, {
      to: body.to,
      body: body.body,
      contactId: body.contactId ?? null,
    });
    return NextResponse.json({ message: msg, provider: "twilio" }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasWhatsAppCloudError || e instanceof SaasWhatsAppError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
