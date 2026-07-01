export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  const specPath = path.join(process.cwd(), "../../docs/openapi/saas-public-v2.yaml");
  try {
    const yaml = readFileSync(specPath, "utf8");
    return new Response(yaml, { headers: { "Content-Type": "application/yaml; charset=utf-8" } });
  } catch {
    return NextResponse.json({
      openapi: "3.1.0",
      info: { title: "Nelvyon Public API v2", version: "2.0.0" },
      servers: [{ url: "https://app.nelvyon.com/api/public/v2" }],
      paths: {
        "/contacts": { get: { summary: "List contacts" }, post: { summary: "Create contact" } },
        "/deals": { get: { summary: "List deals" } },
        "/workflows/trigger": { post: { summary: "Trigger workflow" } },
        "/webhooks/dlq": { get: { summary: "List webhook failures" } },
      },
    });
  }
}
