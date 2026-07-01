import { NextResponse } from "next/server";

import { getSaasLmsService, SaasLmsError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ enrollmentId: string }> }) {
  try {
    const { enrollmentId } = await ctx.params;
    const tenantId = await getSaasLmsService().resolveEnrollmentTenant(enrollmentId);
    const cert = await getSaasLmsService().issueCertificate(tenantId, enrollmentId);
    return NextResponse.json(cert);
  } catch (e: unknown) {
    if (e instanceof SaasLmsError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    const message = e instanceof SaasLmsError ? e.message : "Certificate unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
