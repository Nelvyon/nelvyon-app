export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasTenantMemoryService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    const svc = getSaasTenantMemoryService();
    const chunks = q ? await svc.search(ctx.tenant.id, q) : await svc.list(ctx.tenant.id);
    const settings = await svc.getSettings(ctx.tenant.id);
    return NextResponse.json({ chunks, settings });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json()) as { title?: string; content?: string; tags?: string[] };
    const content = String(body.content ?? "").trim().slice(0, 8000);
    if (!content) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }
    const chunk = await getSaasTenantMemoryService().addChunk(ctx.tenant.id, {
      source: "manual",
      title: body.title,
      content,
      tags: body.tags,
    });
    return NextResponse.json(chunk, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const ok = await getSaasTenantMemoryService().deleteChunk(ctx.tenant.id, id);
    return NextResponse.json({ ok });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
