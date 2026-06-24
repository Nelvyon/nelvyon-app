export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasDocumentsService,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const svc = getSaasDocumentsService();

    if (type === "products") {
      const activeOnly = url.searchParams.get("active") === "true";
      const products = await svc.listProducts(ctx.tenant.id, activeOnly);
      return NextResponse.json({ products });
    }

    const id = url.searchParams.get("id");
    if (id) {
      const document = await svc.getDocument(ctx.tenant.id, id);
      if (!document) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ document });
    }

    const documents = await svc.listDocuments(
      ctx.tenant.id,
      (url.searchParams.get("status") as Parameters<typeof svc.listDocuments>[1]) ?? undefined,
    );
    return NextResponse.json({ documents });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json() as Record<string, unknown>;
    const resourceType = body.resourceType as string | undefined;
    const action = body.action as string | undefined;
    const svc = getSaasDocumentsService();

    // Products
    if (resourceType === "product") {
      if (action === "update") {
        const product = await svc.updateProduct(ctx.tenant.id, String(body.id ?? ""), body as unknown as Parameters<typeof svc.updateProduct>[2]);
        if (!product) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
        return NextResponse.json({ product });
      }
      if (action === "delete") {
        const ok = await svc.deleteProduct(ctx.tenant.id, String(body.id ?? ""));
        if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
        return NextResponse.json({ ok: true });
      }
      const product = await svc.createProduct(ctx.tenant.id, body as unknown as Parameters<typeof svc.createProduct>[1]);
      return NextResponse.json({ product }, { status: 201 });
    }

    // Documents
    if (action === "update") {
      const document = await svc.updateDocument(ctx.tenant.id, String(body.id ?? ""), body as unknown as Parameters<typeof svc.updateDocument>[2]);
      if (!document) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ document });
    }

    const document = await svc.createDocument(ctx.tenant.id, body as unknown as Parameters<typeof svc.createDocument>[1]);
    return NextResponse.json({ document }, { status: 201 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    const type = url.searchParams.get("type");
    const svc = getSaasDocumentsService();

    if (type === "product") {
      const ok = await svc.deleteProduct(ctx.tenant.id, id);
      if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    const ok = await svc.deleteDocument(ctx.tenant.id, id);
    if (!ok) return NextResponse.json({ error: "NOT_FOUND_OR_NOT_DRAFT" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
