import { NextResponse } from "next/server";

import { getGA4Service } from "../../../../../../../../backend/integrations/GoogleAnalytics4Service";

import { requirePlatformClaims } from "@/lib/platformBffAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const creds = await getGA4Service().getCredentials(claims.userId);
  return NextResponse.json({
    connected: Boolean(creds),
    property_id: creds?.propertyId ?? null,
    demo_fallback_available:
      process.env.GA4_DEMO_FALLBACK === "1" || process.env.NODE_ENV !== "production",
  });
}
