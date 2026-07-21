import { NextResponse } from "next/server";

import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { EMPTY_EMBED } from "@/lib/reputacionBffRoute";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function embedScriptUrl(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  if (base) return `${base}/embed/reviews.js`;
  return "/embed/reviews.js";
}

export async function GET(req: Request) {
  try {
    await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({
    ...EMPTY_EMBED,
    embed_html: `<div data-nelvyon-reviews="workspace" data-theme="light"></div>`,
    script_url: embedScriptUrl(),
  });
}
