import { NextResponse } from "next/server";

import { EMPTY_EMBED } from "@/lib/reputacionBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ...EMPTY_EMBED,
    embed_html: `<div data-nelvyon-reviews="workspace" data-theme="light"></div>`,
    script_url: "https://ideal-victory-staging.up.railway.app/embed/reviews.js",
  });
}
