import { NextResponse } from "next/server";

import {
  getAvailableServicePacks,
  getServicePack,
  getServicePackOsSummary,
  SERVICE_PACK_CATALOG,
  SERVICE_PACK_CATEGORIES,
} from "@/lib/saas";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** Public SaaS pack catalog (no OS internals exposed). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const category = searchParams.get("category");
  const availableOnly = searchParams.get("available") === "true";

  if (id) {
    const pack = getServicePack(id);
    if (!pack) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json(
      {
        pack: {
          ...pack,
          os_summary: getServicePackOsSummary(id),
        },
      },
      { headers: NO_STORE },
    );
  }

  let packs = availableOnly ? getAvailableServicePacks() : SERVICE_PACK_CATALOG;
  if (category) {
    packs = packs.filter((p) => p.category === category);
  }

  return NextResponse.json(
    {
      brand: {
        name: "NELVYON",
        tagline: "Marketing digital que ejecuta, no solo planifica",
      },
      categories: SERVICE_PACK_CATEGORIES,
      packs: packs.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        category: p.category,
        verticals: p.verticals,
        availability: p.availability,
        kickoffPath: p.kickoffPath,
        reportPath: p.reportPath,
        estimatedMinutes: p.estimatedMinutes,
        accent: p.accent,
      })),
      total: packs.length,
    },
    { headers: NO_STORE },
  );
}
