import { NextResponse } from "next/server";

import { NELVYON_AGENT_SKILLS, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — Nelvyon specialized agent skills catalog (OpenClaw-inspired, native) */
export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    return NextResponse.json({
      skills: NELVYON_AGENT_SKILLS.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        channels: s.channels,
        nelvyonServices: s.nelvyonServices,
      })),
      total: NELVYON_AGENT_SKILLS.length,
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status === 401 ? 401 : 500;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
