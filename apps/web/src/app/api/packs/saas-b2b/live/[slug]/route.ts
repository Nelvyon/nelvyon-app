import { NextResponse } from "next/server";

import { buildSaasB2bLandingHtml } from "@/lib/packs/saasB2bPackAssets";
import { getSaasB2bPackIntakeBySlug } from "@/lib/packs/saasB2bPackRunLookup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const intake = await getSaasB2bPackIntakeBySlug(slug);
  if (!intake) {
    return NextResponse.json({ error: "Pack SaaS B2B no encontrado para este slug" }, { status: 404 });
  }

  const html = buildSaasB2bLandingHtml(intake);
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
