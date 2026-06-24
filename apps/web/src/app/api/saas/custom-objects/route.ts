export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasCustomObjectsService,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const objectId = url.searchParams.get("objectId");
    const svc = getSaasCustomObjectsService();

    if (objectId) {
      if (url.searchParams.get("records") === "true") {
        const records = await svc.listRecords(ctx.tenant.id, objectId);
        return NextResponse.json({ records });
      }
      const object = await svc.getObject(ctx.tenant.id, objectId);
      if (!object) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ object });
    }

    const objects = await svc.listObjects(ctx.tenant.id);
    return NextResponse.json({ objects });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json() as Record<string, unknown>;
    const action = body.action as string | undefined;
    const svc = getSaasCustomObjectsService();

    if (action === "create_record") {
      const record = await svc.createRecord(
        ctx.tenant.id, String(body.objectId ?? ""),
        (body.data as Record<string, unknown>) ?? {},
      );
      return NextResponse.json({ record }, { status: 201 });
    }

    if (action === "update_record") {
      const record = await svc.updateRecord(
        ctx.tenant.id, String(body.objectId ?? ""), String(body.recordId ?? ""),
        (body.data as Record<string, unknown>) ?? {},
      );
      if (!record) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ record });
    }

    if (action === "delete_record") {
      const ok = await svc.deleteRecord(
        ctx.tenant.id, String(body.objectId ?? ""), String(body.recordId ?? ""),
      );
      if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (action === "update_object") {
      const object = await svc.updateObject(ctx.tenant.id, String(body.id ?? ""), body as unknown as Parameters<typeof svc.updateObject>[2]);
      if (!object) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ object });
    }

    // Default: create object
    const object = await svc.createObject(ctx.tenant.id, body as unknown as Parameters<typeof svc.createObject>[1]);
    return NextResponse.json({ object }, { status: 201 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    const ok = await getSaasCustomObjectsService().deleteObject(ctx.tenant.id, id);
    if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
