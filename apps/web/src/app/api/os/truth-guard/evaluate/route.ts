import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsTruthGuardService, type TruthChannel } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** POST { channel, text, subject?, headline?, description?, sectorId?, packRunId? } */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      channel?: TruthChannel;
      text?: string;
      subject?: string;
      headline?: string;
      description?: string;
      sectorId?: string;
      packRunId?: string;
    };
    if (!body.channel || !["landing", "email", "ads"].includes(body.channel) || typeof body.text !== "string") {
      return NextResponse.json({ error: "channel y text requeridos", code: "VALIDATION" }, { status: 400 });
    }
    const result = await getOsTruthGuardService().evaluateAndPersist({
      channel: body.channel,
      text: body.text,
      subject: body.subject,
      headline: body.headline,
      description: body.description,
      sectorId: body.sectorId ?? null,
      packRunId: body.packRunId ?? null,
    });
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[os/truth-guard/evaluate POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
