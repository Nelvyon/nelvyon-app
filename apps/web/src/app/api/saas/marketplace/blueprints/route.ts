export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

const BLUEPRINTS: Record<string, string> = {
  make: "make-nelvyon-webhook.json",
  n8n: "n8n-nelvyon-contacts.json",
  zapier: "zapier-nelvyon-lead.json",
};

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const slug = new URL(req.url).searchParams.get("slug") ?? "";
    const file = BLUEPRINTS[slug];
    if (!file) {
      return NextResponse.json({ error: "Blueprint no encontrado", available: Object.keys(BLUEPRINTS) }, { status: 404 });
    }
    const filePath = path.join(process.cwd(), "../../packages/automation-blueprints", file);
    const json = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nelvyon.com";
    return NextResponse.json({
      slug,
      tenantId: ctx.tenant.id,
      blueprint: json,
      webhookUrl: `${appUrl}/api/public/v2/workflows/trigger`,
      docsUrl: `${appUrl}/api/public/v2/openapi`,
    });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
