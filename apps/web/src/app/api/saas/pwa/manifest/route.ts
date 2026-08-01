import { type NextRequest, NextResponse } from "next/server";
import { SAAS_PWA_DEFAULT_ICONS, getSaasPwaService, requireSaasContext, type PwaManifest } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Per-tenant white-label manifest. Falls back to defaults when unauthenticated. */
export async function GET(req: NextRequest) {
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
    // Never ship an empty icons array — an installable PWA manifest requires at least one icon.
    icons: SAAS_PWA_DEFAULT_ICONS,
    categories: ["business", "productivity"],
    lang: "es",
  };

  let manifest: PwaManifest = defaultManifest;
  try {
    // Lazy service init — DbClient throw without DATABASE_URL must not 500 the public manifest.
    const svc = getSaasPwaService();
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
  } catch {
    manifest = defaultManifest;
  }

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
