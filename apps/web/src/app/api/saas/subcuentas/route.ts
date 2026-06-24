export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasSubcuentasService,
} from "@nelvyon/saas";
import type { SubcuentaStatus } from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as SubcuentaStatus | null;
    const id = url.searchParams.get("id");
    const svc = getSaasSubcuentasService();

    if (id) {
      const sub = await svc.get(ctx.tenant.id, id);
      if (!sub) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ subcuenta: sub });
    }

    const subcuentas = await svc.list(ctx.tenant.id, status ?? undefined);
    return NextResponse.json({ subcuentas });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json() as Record<string, unknown>;
    const action = body.action as string | undefined;
    const svc = getSaasSubcuentasService();

    if (action === "suspend") {
      const sub = await svc.suspend(ctx.tenant.id, String(body.id ?? ""));
      if (!sub) return NextResponse.json({ error: "NOT_FOUND_OR_NOT_ACTIVE" }, { status: 404 });
      return NextResponse.json({ subcuenta: sub });
    }

    if (action === "reactivate") {
      const sub = await svc.reactivate(ctx.tenant.id, String(body.id ?? ""));
      if (!sub) return NextResponse.json({ error: "NOT_FOUND_OR_NOT_SUSPENDED" }, { status: 404 });
      return NextResponse.json({ subcuenta: sub });
    }

    if (action === "usage") {
      const usage = await svc.getUsage(ctx.tenant.id, String(body.id ?? ""));
      if (!usage) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ usage });
    }

    // Default: create
    const subcuenta = await svc.create(ctx.tenant.id, body as unknown as Parameters<typeof svc.create>[1]);
    return NextResponse.json({ subcuenta }, { status: 201 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    const ok = await getSaasSubcuentasService().cancel(ctx.tenant.id, id);
    if (!ok) return NextResponse.json({ error: "NOT_FOUND_OR_NOT_SUSPENDED" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
