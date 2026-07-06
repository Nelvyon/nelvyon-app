export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

/** GET /api/public/v1/openapi — OpenAPI 3.1 spec for Nelvyon Public API v1. */
export async function GET() {
  const specPath = path.join(process.cwd(), "../../docs/openapi/saas-public-v1.yaml");
  try {
    const yaml = readFileSync(specPath, "utf8");
    return new Response(yaml, {
      headers: {
        "Content-Type": "application/yaml; charset=utf-8",
        "Content-Disposition": 'attachment; filename="saas-public-v1.yaml"',
      },
    });
  } catch {
    return NextResponse.json({ error: "OpenAPI spec not found" }, { status: 404 });
  }
}
