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
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const logsMode = url.searchParams.get("logs") === "true";
    const svc = getSaasWebhooksService();

    if (id && logsMode) {
      const deliveries = await svc.listDeliveries(ctx.tenant.id, id);
      const logs = deliveries.map((d) => ({
        id: d.id,
        webhookId: d.webhookId,
        event: d.event,
        statusCode: d.statusCode ?? 0,
        duration: d.durationMs ?? 0,
        payload: typeof d.payload === "string" ? d.payload : JSON.stringify(d.payload ?? {}),
        createdAt: d.createdAt,
        success: d.success,
      }));
      return NextResponse.json({ logs });
    }

    const webhooks = await svc.list(ctx.tenant.id);
    return NextResponse.json({ webhooks });
  } catch (e: unknown) {
    if (e instanceof SaasWebhooksError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
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

export async function PATCH(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const id = typeof b.id === "string" ? b.id : "";
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const patch: { name?: string; url?: string; events?: string[]; active?: boolean } = {};
    if (typeof b.name === "string") patch.name = b.name;
    if (typeof b.url === "string") patch.url = b.url;
    if (Array.isArray(b.events)) patch.events = b.events.filter((x): x is string => typeof x === "string");
    if (typeof b.active === "boolean") patch.active = b.active;

    const webhook = await getSaasWebhooksService().update(ctx.tenant.id, id, patch);
    return NextResponse.json({ webhook });
  } catch (e: unknown) {
    if (e instanceof SaasWebhooksError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await getSaasWebhooksService().delete(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasWebhooksError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
