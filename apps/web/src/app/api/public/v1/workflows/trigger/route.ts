import { NextResponse } from "next/server";
import { requirePublicApiContext } from "../../../../../../lib/requirePublicApiContext";
import { getSaasWorkflowService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const gate = await requirePublicApiContext(req, "crm.write");
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json() as Record<string, unknown>;
    const workflowId = String(body.workflowId ?? "").trim();
    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required" }, { status: 400, headers: gate.rateHeaders });
    }
    const triggerData = (body.data ?? {}) as Record<string, unknown>;
    const run = await getSaasWorkflowService().executeWorkflow(workflowId, gate.ctx.tenantId, triggerData);
    return NextResponse.json(run, { status: 201, headers: gate.rateHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 400, headers: gate.rateHeaders });
  }
}
