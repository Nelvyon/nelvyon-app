import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsPackGateService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/** POST { runKey? } — run the local pack gate (fixtures + dry-run; vitest skipped in API). */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as { runKey?: string };
    // runVitest:false — the API path validates fixtures + dry-run; vitest runs in CI.
    const result = await getOsPackGateService().runLocalGate({
      runKey: body.runKey,
      source: "manual",
      runVitest: false,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[os/gate/run POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
