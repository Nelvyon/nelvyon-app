import { NextResponse } from "next/server";

import { buildLocalSeoReport, resolvePackAppOrigin, resolveSeoReportUrl } from "@/lib/packs/localPackProduction";
import { getLocalPackIntakeBySlug } from "@/lib/packs/localPackRunLookup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const intake = await getLocalPackIntakeBySlug(slug);
  if (!intake) {
    return NextResponse.json({ error: "Informe SEO no encontrado" }, { status: 404 });
  }

  const origin = resolvePackAppOrigin();
  const report = buildLocalSeoReport(intake, 88);
  return NextResponse.json({
    ...report,
    report_url: resolveSeoReportUrl(slug, origin),
    production: true,
  });
}
