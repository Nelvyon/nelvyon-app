import { NextResponse } from "next/server";

import { buildWholesaleCatalogPayload } from "@/lib/partners/wholesaleCatalog";
import { requirePlatformClaims } from "@/lib/platformBffAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;
  return NextResponse.json(buildWholesaleCatalogPayload());
}
