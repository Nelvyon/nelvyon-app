import { NextResponse } from "next/server";
import {
  getSaasWebhooksService,
  SaasWebhooksError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasWebhooksError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const webhooks = await getSaasWebhooksService().list(ctx.tenant.id);
    return NextResponse.json({ webhooks });
  } catch (e: unknown) {
    if (e instanceof SaasWebhooksError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const webhook = await getSaasWebhooksService().create(ctx.tenant.id, {
      name: typeof b.name === "string" ? b.name : "",
      url: typeof b.url === "string" ? b.url : "",
      events: Array.isArray(b.events) ? b.events.filter((x): x is string => typeof x === "string") : [],
    });
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasWebhooksError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
