import { NextResponse } from "next/server";

import {
  getTemplateLibraryStats,
  listTemplates,
  resolvePackTemplateBundle,
  resolveTemplate,
} from "@/lib/template-library";
import type { TemplateLibraryQuery, TemplateKind, TemplateSector, TemplateService } from "@/lib/template-library/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "list";

  if (action === "stats") {
    return NextResponse.json({ ok: true, stats: getTemplateLibraryStats() });
  }

  if (action === "resolve") {
    const service = searchParams.get("service");
    const kind = searchParams.get("kind");
    const sector = searchParams.get("sector");
    if (!service || !kind || !sector) {
      return NextResponse.json({ ok: false, error: "service, kind, sector required" }, { status: 400 });
    }
    const result = resolveTemplate({
      service: service as Parameters<typeof resolveTemplate>[0]["service"],
      kind: kind as Parameters<typeof resolveTemplate>[0]["kind"],
      sector: sector as Parameters<typeof resolveTemplate>[0]["sector"],
      pack_id: searchParams.get("pack_id") ?? undefined,
      language: (searchParams.get("language") as "es") ?? undefined,
    });
    return NextResponse.json({ ok: true, result });
  }

  if (action === "seeds") {
    const { seedStoreStats, getSeedsForPack, listSeedMetadata } = await import(
      "@/lib/template-library/ingest/seed-store"
    );
    const pack_id = searchParams.get("pack_id");
    if (pack_id) {
      return NextResponse.json({
        ok: true,
        pack_id,
        seeds: getSeedsForPack(pack_id).map((s) => ({
          slug: s.slug,
          item_name: s.item_name,
          provider: s.provider,
          status: s.status,
        })),
      });
    }
    return NextResponse.json({ ok: true, stats: seedStoreStats() });
  }

  if (action === "pack-bundle") {
    const pack_id = searchParams.get("pack_id");
    const sector = searchParams.get("sector");
    if (!pack_id || !sector) {
      return NextResponse.json({ ok: false, error: "pack_id, sector required" }, { status: 400 });
    }
    const bundle = resolvePackTemplateBundle({
      pack_id,
      sector: sector as Parameters<typeof resolvePackTemplateBundle>[0]["sector"],
    });
    return NextResponse.json({
      ok: true,
      bundle: Object.fromEntries(
        Object.entries(bundle).map(([k, v]) => [k, v ? { id: v.id, name: v.name } : null]),
      ),
    });
  }

  const listQuery: TemplateLibraryQuery = {
    service: (searchParams.get("service") as TemplateService | null) ?? undefined,
    kind: (searchParams.get("kind") as TemplateKind | null) ?? undefined,
    sector: (searchParams.get("sector") as TemplateSector | null) ?? undefined,
    pack_id: searchParams.get("pack_id") ?? undefined,
    status: "active",
    limit: Number(searchParams.get("limit") ?? "50"),
  };
  const templates = listTemplates(listQuery);

  return NextResponse.json({
    ok: true,
    count: templates.length,
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      kind: t.kind,
      service: t.service,
      sector: t.sector,
      tags: t.tags,
      scores: t.scores,
      pack_ids: t.pack_ids,
    })),
  });
}
