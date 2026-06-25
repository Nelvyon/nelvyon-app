import { NextResponse } from "next/server";
import {
  getSaasWhatsAppCloudService,
  SaasWhatsAppCloudError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasWhatsAppCloudError): NextResponse {
  const status = e.code === "NOT_CONFIGURED" ? 503 : e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/whatsapp/templates — list synced templates */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const templates = await getSaasWhatsAppCloudService().listTemplates(ctx.tenant.id, {
      status: url.searchParams.get("status") ?? undefined,
      language: url.searchParams.get("language") ?? undefined,
    });
    return NextResponse.json({ templates });
  } catch (e: unknown) {
    if (e instanceof SaasWhatsAppCloudError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/whatsapp/templates — action: sync */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (body.action !== "sync") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const count = await getSaasWhatsAppCloudService().syncTemplates(ctx.tenant.id);
    return NextResponse.json({ synced: count });
  } catch (e: unknown) {
    if (e instanceof SaasWhatsAppCloudError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
