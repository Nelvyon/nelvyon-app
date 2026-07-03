export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getNelvyonMcpService, MCP_TOOLS } from "@nelvyon/saas";
import { requirePublicApiContext } from "@/lib/requirePublicApiContext";

/** GET /api/mcp — list MCP tools */
export async function GET(req: Request) {
  const gate = await requirePublicApiContext(req, "mcp.read");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ tools: MCP_TOOLS }, { headers: gate.rateHeaders });
}

/** POST /api/mcp — invoke MCP tool */
export async function POST(req: Request) {
  const gate = await requirePublicApiContext(req, "mcp.write");
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as { tool?: string; arguments?: Record<string, unknown> };
    const tool = String(body.tool ?? "").trim();
    if (!tool || tool.length > 64) {
      return NextResponse.json({ error: "tool required" }, { status: 400, headers: gate.rateHeaders });
    }
    const argsRaw = JSON.stringify(body.arguments ?? {});
    if (argsRaw.length > 16_384) {
      return NextResponse.json({ error: "arguments too large" }, { status: 400, headers: gate.rateHeaders });
    }
    const svc = getNelvyonMcpService();
    const result = await svc.invokeTool(
      gate.ctx.tenantId,
      gate.ctx.keyId,
      tool,
      body.arguments ?? {},
      gate.ctx.keyId,
    );
    return NextResponse.json(result, { headers: gate.rateHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
