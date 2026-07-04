export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasPrivateAiService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    return NextResponse.json({ agents: getSaasPrivateAiService().listAgents() });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.execute");
    const body = (await req.json()) as {
      agentId?: string;
      input?: string;
      action?: string;
      toolId?: string;
    };
    const input = String(body.input ?? "").trim();
    const agentId = String(body.agentId ?? "ceo_supervisor").trim();
    if (!input) {
      return NextResponse.json({ error: "input required" }, { status: 400 });
    }

    const result = await getSaasPrivateAiService().runAgent({
      tenantId: ctx.tenant.id,
      userId: ctx.claims.userId,
      agentId,
      input,
      action: body.action,
      toolId: body.toolId as never,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
