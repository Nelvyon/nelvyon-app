import { NextResponse } from "next/server";

import { requirePlatformContext } from "@/lib/platformBffAuth";
import { startPartnerConnectOnboarding } from "@/lib/partners/partnerConnectService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  // Vincula la cuenta Stripe que RECIBE el dinero: owner-only.
  const gate = await requirePlatformContext(req, "partners.connect.manage");
  if (gate instanceof NextResponse) return gate;
  const { claims, workspaceId } = gate;

  const email = claims.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email de partner no encontrado en sesión" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/dashboard/partners?connect=return`;
  const refreshUrl = `${origin}/dashboard/partners?connect=refresh`;

  try {
    const result = await startPartnerConnectOnboarding({
      workspaceId,
      userId: claims.userId,
      email,
      returnUrl,
      refreshUrl,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Onboarding failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
