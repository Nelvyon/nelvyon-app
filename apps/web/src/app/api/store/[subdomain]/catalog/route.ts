import { NextResponse } from "next/server";
import { getSaasStoreService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/store/[subdomain]/catalog
 * Public — returns active products + store settings for the storefront.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ subdomain: string }> }) {
  try {
    const { subdomain } = await params;
    if (!subdomain?.trim()) return NextResponse.json({ error: "subdomain required" }, { status: 400 });
    const catalog = await getSaasStoreService().getPublicCatalog(subdomain);
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
