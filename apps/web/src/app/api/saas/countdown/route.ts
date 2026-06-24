export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasCountdownService,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const svc = getSaasCountdownService();
    if (id) {
      const timer = await svc.get(ctx.tenant.id, id);
      if (!timer) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ timer });
    }
    const timers = await svc.list(ctx.tenant.id);
    return NextResponse.json({ timers });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json() as Record<string, unknown>;
    const action = body.action as string | undefined;
    const svc = getSaasCountdownService();

    if (action === "scan") {
      await svc.trackScan(String(body.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    if (action === "update") {
      const timer = await svc.update(ctx.tenant.id, String(body.id ?? ""), body as unknown as Parameters<typeof svc.update>[2]);
      if (!timer) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ timer });
    }

    const timer = await svc.create(ctx.tenant.id, body as unknown as Parameters<typeof svc.create>[1]);
    return NextResponse.json({ timer }, { status: 201 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    const ok = await getSaasCountdownService().delete(ctx.tenant.id, id);
    if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
