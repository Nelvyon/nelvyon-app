import { NextResponse } from "next/server";

import { NELVYON_AGENT_SKILLS, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

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
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Devolvia 500 con el cuerpo «Unauthorized»: codigo equivocado y ademas
    // una descripcion falsa de lo ocurrido. Un tenant ausente no es una averia
    // ni una falta de credenciales.
    const estado = saasErrorStatus(e);
    if (estado >= 500) console.error("[agent/skills GET]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
