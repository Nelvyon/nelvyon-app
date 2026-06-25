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
  const status = e.code === "NOT_CONFIGURED" ? 503 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/whatsapp/catalog — list synced catalog products */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const products = await getSaasWhatsAppCloudService().listCatalogProducts(ctx.tenant.id);
    return NextResponse.json({ products });
  } catch (e: unknown) {
    if (e instanceof SaasWhatsAppCloudError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/whatsapp/catalog — action: sync */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (body.action !== "sync") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const count = await getSaasWhatsAppCloudService().syncCatalog(ctx.tenant.id);
    return NextResponse.json({ synced: count });
  } catch (e: unknown) {
    if (e instanceof SaasWhatsAppCloudError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
