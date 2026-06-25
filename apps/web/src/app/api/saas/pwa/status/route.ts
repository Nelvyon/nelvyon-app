export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

/** GET /api/saas/pwa/status — returns PWA install metadata for this SaaS scope */
export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    return NextResponse.json({
      installable: true,
      scope: "/saas",
      manifestUrl: "/manifest-saas.json",
      swUrl: "/sw.js",
      offlineUrl: "/offline-saas.html",
      themeColor: "#0084ff",
      backgroundColor: "#020817",
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
