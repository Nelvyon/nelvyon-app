import { type NextRequest, NextResponse } from "next/server";
import { getSaasPwaService, requireSaasContext, type PwaManifest } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Per-tenant white-label manifest. Falls back to defaults when unauthenticated. */
export async function GET(req: NextRequest) {
  const svc = getSaasPwaService();
  const defaultManifest: PwaManifest = {
    name: "Nelvyon SaaS",
    short_name: "Nelvyon",
    description: "CRM, campañas y automatizaciones de marketing — operado por IA",
    start_url: "/saas/dashboard",
    scope: "/saas",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#0084ff",
    background_color: "#020817",
    icons: [],
    categories: ["business", "productivity"],
    lang: "es",
  };

  let manifest: PwaManifest = defaultManifest;
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    manifest = await svc.buildManifest(ctx.tenant.id);
  } catch {
    try {
      manifest = await svc.buildManifest("__default__");
    } catch {
      manifest = defaultManifest;
    }
  }

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
