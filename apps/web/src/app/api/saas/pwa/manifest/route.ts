import { type NextRequest, NextResponse } from "next/server";
import { getSaasPwaService, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Per-tenant white-label manifest. Falls back to defaults when unauthenticated. */
export async function GET(req: NextRequest) {
  const svc = getSaasPwaService();
  let manifest;
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    manifest = await svc.buildManifest(ctx.tenant.id);
  } catch {
    // Unauthenticated fetch (e.g. install-time) → default Nelvyon manifest.
    manifest = await svc.buildManifest("__default__");
  }
  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
