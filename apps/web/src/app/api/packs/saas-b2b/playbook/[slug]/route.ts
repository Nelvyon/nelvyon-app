import { NextResponse } from "next/server";

import { buildOutboundPlaybook } from "@/lib/packs/saasB2bPackProduction";
import { getSaasB2bPackIntakeBySlug } from "@/lib/packs/saasB2bPackRunLookup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const intake = await getSaasB2bPackIntakeBySlug(slug);
  if (!intake) {
    return NextResponse.json({ error: "Pack SaaS B2B no encontrado para este slug" }, { status: 404 });
  }

  return NextResponse.json(buildOutboundPlaybook(intake));
}
