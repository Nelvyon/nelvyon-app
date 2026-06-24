import { NextResponse } from "next/server";
import { getSaasStoreService, SaasStoreError, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasStoreError) {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { id } = await params;
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const product = await getSaasStoreService().updateStoreProduct(ctx.tenant.id, id, {
      name: typeof b.name === "string" ? b.name : undefined,
      description: typeof b.description === "string" ? b.description : undefined,
      price: b.price !== undefined ? Number(b.price) : undefined,
      type: typeof b.type === "string" ? b.type : undefined,
      imageUrl: typeof b.image_url === "string" ? b.image_url : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
      sku: typeof b.sku === "string" ? b.sku : undefined,
      stock: b.stock !== undefined ? Number(b.stock) : undefined,
      slug: typeof b.slug === "string" ? b.slug : undefined,
      category: typeof b.category === "string" ? b.category : undefined,
      variants: Array.isArray(b.variants) ? b.variants as never : undefined,
    });
    return NextResponse.json({ product });
  } catch (e: unknown) {
    if (e instanceof SaasStoreError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { id } = await params;
    await getSaasStoreService().deleteStoreProduct(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasStoreError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
