import { NextResponse } from "next/server";

import { buildLocalBotHtml } from "@/lib/packs/localPackAssets";
import { getLocalPackIntakeBySlug } from "@/lib/packs/localPackRunLookup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const intake = await getLocalPackIntakeBySlug(slug);
  if (!intake) {
    return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 });
  }

  const html = buildLocalBotHtml(intake);
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
