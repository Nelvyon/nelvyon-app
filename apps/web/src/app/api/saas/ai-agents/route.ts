export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  agentRegistryStatus,
  listUnifiedAgents,
  getUnifiedAgent,
  getPromptRegistry,
  type UnifiedAgentRecord,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") ?? "status";

    if (resource === "status") {
      return NextResponse.json(agentRegistryStatus());
    }
    if (resource === "list") {
      return NextResponse.json({
        agents: listUnifiedAgents().map((a: UnifiedAgentRecord) => ({
          id: a.id,
          name: a.name,
          source: a.source,
          runtimeReady: a.runtimeReady,
          deprecated: a.deprecated,
          canonicalId: a.canonicalId,
          lifecycle: a.lifecycle,
          hierarchyLevel: a.hierarchyLevel,
          reportsTo: a.reportsTo,
          effectiveRuntimeId: a.effectiveRuntimeId,
          department: a.design?.department,
        })),
      });
    }
    if (resource === "org") {
      const agents = listUnifiedAgents().filter((a: UnifiedAgentRecord) => !a.deprecated);
      return NextResponse.json({
        contractVersion: "1.1.0",
        l1: agents.filter((a: UnifiedAgentRecord) => a.hierarchyLevel === "L1_executive"),
        l2: agents.filter((a: UnifiedAgentRecord) => a.hierarchyLevel === "L2_domain"),
        status: agentRegistryStatus(),
      });
    }
    if (resource === "get") {
      const id = url.searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const agent = getUnifiedAgent(id);
      if (!agent) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ agent });
    }
    if (resource === "prompts") {
      const agentId = url.searchParams.get("agentId");
      const reg = getPromptRegistry();
      return NextResponse.json({
        prompts: agentId ? reg.listByAgent(agentId) : reg.listAll(),
      });
    }
    return NextResponse.json({ error: "unknown_resource" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
