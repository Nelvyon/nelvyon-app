import { NextResponse } from "next/server";

import { getPackFeaturedPreset } from "@/lib/packs/packEliteTemplates";
import {
  LOCAL_GROWTH_PACK_ID,
  SAAS_B2B_GROWTH_PACK_ID,
  type LocalGrowthPackIntake,
  type SaasB2bGrowthPackIntake,
} from "@/lib/packs/types";
import { buildLocalLandingHtml, buildLocalLandingProvenance } from "@/lib/packs/localPackAssets";
import { buildSaasB2bLandingHtml, buildSaasB2bLandingProvenance } from "@/lib/packs/saasB2bPackAssets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEMO_PRESETS: Record<
  string,
  { pack_id: string; build: () => { html: string; provenance: Record<string, unknown> } }
> = {
  "local-restaurant-demo": {
    pack_id: LOCAL_GROWTH_PACK_ID,
    build: () => {
      const preset = getPackFeaturedPreset(LOCAL_GROWTH_PACK_ID);
      const intake = preset.intake as LocalGrowthPackIntake;
      return {
        html: buildLocalLandingHtml(intake),
        provenance: buildLocalLandingProvenance(intake),
      };
    },
  },
  "saas-flowmetrics-demo": {
    pack_id: SAAS_B2B_GROWTH_PACK_ID,
    build: () => {
      const preset = getPackFeaturedPreset(SAAS_B2B_GROWTH_PACK_ID);
      const intake = preset.intake as SaasB2bGrowthPackIntake;
      return {
        html: buildSaasB2bLandingHtml(intake),
        provenance: buildSaasB2bLandingProvenance(intake),
      };
    },
  },
};

export async function GET(req: Request, ctx: { params: Promise<{ presetId: string }> }) {
  const { presetId } = await ctx.params;
  const demo = DEMO_PRESETS[presetId];
  if (!demo) {
    return NextResponse.json(
      { error: "Preset no encontrado", available: Object.keys(DEMO_PRESETS) },
      { status: 404 },
    );
  }

  const url = new URL(req.url);
  if (url.searchParams.get("format") === "json") {
    const { html, provenance } = demo.build();
    return NextResponse.json({ preset_id: presetId, pack_id: demo.pack_id, provenance, html_length: html.length });
  }

  const { html } = demo.build();
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "X-Nelvyon-Seed-Demo": presetId,
    },
  });
}
