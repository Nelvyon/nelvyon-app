export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasMarketplaceService,
  isPgMissingRelation,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

const CATALOG_FALLBACK = [
  { id: "zapier", slug: "zapier", name: "Zapier", description: "Conecta 5000+ apps con triggers y acciones Nelvyon", author: "Nelvyon", category: "automation", installCount: 0, installed: false },
  { id: "make", slug: "make", name: "Make.com", description: "Automatizaciones visuales con webhooks Nelvyon", author: "Nelvyon", category: "automation", installCount: 0, installed: false },
  { id: "n8n", slug: "n8n", name: "n8n", description: "Self-hosted automation con API pública v2", author: "Nelvyon", category: "automation", installCount: 0, installed: false },
  { id: "hubspot-sync", slug: "hubspot-sync", name: "HubSpot Sync", description: "Sincronización bidireccional contactos y deals", author: "Nelvyon", category: "crm", installCount: 0, installed: false },
  { id: "google-analytics", slug: "google-analytics", name: "Google Analytics 4", description: "Eventos de conversión desde funnels", author: "Nelvyon", category: "analytics", installCount: 0, installed: false },
];

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const apps = await getSaasMarketplaceService().listApps(ctx.tenant.id);
    return NextResponse.json({ apps });
  } catch (e) {
    if (isPgMissingRelation(e)) {
      return NextResponse.json({ apps: CATALOG_FALLBACK, schemaPending: true });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as Record<string, unknown>;
    const svc = getSaasMarketplaceService();
    const appId = String(body.appId ?? "");
    if (body.action === "uninstall") {
      await svc.uninstall(ctx.tenant.id, appId);
    } else {
      await svc.install(ctx.tenant.id, appId);
    }
    return NextResponse.json({ apps: await svc.listApps(ctx.tenant.id) });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
