import { type NextRequest, NextResponse } from "next/server";

import { buildMockSocialPost, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — rule-based social post draft (0€ without OPENAI_API_KEY) */
export async function POST(req: NextRequest) {
  try {
    await requireSaasContext(req, "contacts.read");
    const body = (await req.json().catch(() => ({}))) as { topic?: string; platform?: string };
    const draft = buildMockSocialPost({
      topic: body.topic,
      platform: body.platform,
    });
    return NextResponse.json({ draft, mock: true });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status === 401 ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Internal error" }, { status });
  }
}
