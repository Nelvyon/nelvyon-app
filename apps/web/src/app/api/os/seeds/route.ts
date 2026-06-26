import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  getOsEnvatoSeedService,
  type SeedCatalogFilters,
  type SeedSource,
  type DownloadStatus,
} from "../../../../../../../backend/os-agents/seeds/OsEnvatoSeedService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { searchParams } = new URL(req.url);
    const filters: SeedCatalogFilters = {};
    if (searchParams.get("sector")) filters.sector = searchParams.get("sector")!;
    if (searchParams.get("source")) filters.source = searchParams.get("source") as SeedSource;
    if (searchParams.get("status")) filters.status = searchParams.get("status") as DownloadStatus;
    if (searchParams.get("limit")) filters.limit = parseInt(searchParams.get("limit")!, 10);

    const svc = getOsEnvatoSeedService();
    const [stats, items] = await Promise.all([
      svc.getSectorStats(),
      svc.listCatalog(filters),
    ]);
    return NextResponse.json({ stats, items });
  } catch (e) {
    console.error("[os/seeds GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
