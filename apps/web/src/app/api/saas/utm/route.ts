import { NextResponse } from "next/server";
import {
  getSaasUtmService,
  SaasUtmError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasUtmError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const search = searchParams.get("search") ?? undefined;

    if (id && searchParams.get("stats") === "1") {
      const stats = await getSaasUtmService().getStats(ctx.tenant.id, id);
      return NextResponse.json({ stats });
    }
    if (id) {
      const link = await getSaasUtmService().get(ctx.tenant.id, id);
      return NextResponse.json({ link });
    }

    const links = await getSaasUtmService().list(ctx.tenant.id, search);
    return NextResponse.json({ links });
  } catch (e: unknown) {
    if (e instanceof SaasUtmError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const link = await getSaasUtmService().create(ctx.tenant.id, {
      name: typeof b.name === "string" ? b.name : "",
      destinationUrl: typeof b.destination_url === "string" ? b.destination_url : "",
      utmSource: typeof b.utm_source === "string" ? b.utm_source : "",
      utmMedium: typeof b.utm_medium === "string" ? b.utm_medium : "",
      utmCampaign: typeof b.utm_campaign === "string" ? b.utm_campaign : "",
      utmTerm: typeof b.utm_term === "string" ? b.utm_term : undefined,
      utmContent: typeof b.utm_content === "string" ? b.utm_content : undefined,
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasUtmError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await getSaasUtmService().delete(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasUtmError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
