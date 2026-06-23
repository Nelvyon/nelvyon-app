import { NextResponse } from "next/server";

import { linkGa4PropertyFromGoogleOAuth } from "@/lib/integrations/ga4/linkGa4FromOAuth";
import { requirePlatformClaims } from "@/lib/platformBffAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const propertyId =
    typeof body === "object" && body !== null && "property_id" in body
      ? String((body as { property_id: unknown }).property_id ?? "").trim()
      : "";
  if (!propertyId) {
    return NextResponse.json({ error: "property_id requerido" }, { status: 400 });
  }

  try {
    await linkGa4PropertyFromGoogleOAuth(claims.userId, propertyId);
    return NextResponse.json({ ok: true, property_id: propertyId.replace(/^properties\//, "") });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "No se pudo vincular GA4";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
