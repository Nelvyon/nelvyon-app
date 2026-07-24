export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasMcpProductiveService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

/** MCP Productivo — list tools + health */
export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    const svc = getSaasMcpProductiveService();
    return NextResponse.json({
      health: svc.health(),
      tools: svc.listTools(),
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** MCP Productivo — invoke tool (policy + audit) */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.execute");
    const body = (await req.json()) as {
      toolName?: string;
      args?: Record<string, unknown>;
      agentId?: string;
      dryRun?: boolean;
      idempotencyKey?: string;
    };
    const toolName = String(body.toolName ?? "").trim();
    if (!toolName) {
      return NextResponse.json({ error: "toolName required" }, { status: 400 });
    }

    const result = await getSaasMcpProductiveService().invoke({
      tenantId: ctx.tenant.id,
      userId: ctx.claims.userId,
      agentId: body.agentId ?? "saas_http",
      toolName,
      args: body.args ?? {},
      roles: [ctx.role],
      // Never invent mcp.write from an API route — requireSaasContext already verified
      // workflows.execute for this caller; write-tool authorization still flows through
      // PolicyEngine's role/scope checks (owner/admin roles or an explicit mcp.write claim).
      scopes: ["mcp.read", "workflows.execute"],
      dryRun: body.dryRun,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json({ result });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
