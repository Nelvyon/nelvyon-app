import { NextResponse } from "next/server";
import { getSaasStoreService, SaasStoreError, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasStoreError) {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

/** GET /api/saas/store/products?active=true&category=X */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const products = await getSaasStoreService().listStoreProducts(ctx.tenant.id, {
      activeOnly: url.searchParams.get("active") === "true",
      category: url.searchParams.get("category") ?? undefined,
    });
    return NextResponse.json({ products });
  } catch (e: unknown) {
    if (e instanceof SaasStoreError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/store/products */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const product = await getSaasStoreService().createStoreProduct(ctx.tenant.id, {
      name: typeof b.name === "string" ? b.name : "",
      description: typeof b.description === "string" ? b.description : undefined,
      price: typeof b.price === "number" ? b.price : Number(b.price) || 0,
      currency: typeof b.currency === "string" ? b.currency : undefined,
      type: typeof b.type === "string" ? b.type : undefined,
      imageUrl: typeof b.image_url === "string" ? b.image_url : undefined,
      sku: typeof b.sku === "string" ? b.sku : undefined,
      stock: typeof b.stock === "number" ? b.stock : Number(b.stock) || 0,
      slug: typeof b.slug === "string" ? b.slug : undefined,
      category: typeof b.category === "string" ? b.category : undefined,
      variants: Array.isArray(b.variants) ? b.variants as never : undefined,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasStoreError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
