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
    if (resource === "workflows") {
      const { workflowCatalogStatus, listCertifiedWorkflows } = await import("../../../../../../../backend/agents/workforce/workflowCatalog");
      return NextResponse.json({
        ...workflowCatalogStatus(),
        workflows: listCertifiedWorkflows().map((w: { id: string; domain: string; title: string; pattern: string; agents: string[]; requiresHumanApproval: boolean; sloMs: number }) => ({
          id: w.id,
          domain: w.domain,
          title: w.title,
          pattern: w.pattern,
          agents: w.agents,
          requiresHumanApproval: w.requiresHumanApproval,
          sloMs: w.sloMs,
        })),
      });
    }
    if (resource === "leaderboard") {
      const { listLeaderboardEntries, leaderboardForCapability } = await import("../../../../../../../backend/agents/workforce/leaderboard");
      const capability = url.searchParams.get("capability") ?? "task_success";
      return NextResponse.json({
        capability,
        ranking: leaderboardForCapability(capability as "task_success"),
        all: listLeaderboardEntries().slice(-100),
      });
    }
    if (resource === "canaries") {
      const { listCanaries } = await import("../../../../../../../backend/agents/workforce/canaryPipeline");
      const { listImprovementProposals, listImprovementVersions } = await import("../../../../../../../backend/agents/improvement/controlledImprovement");
      return NextResponse.json({
        canaries: listCanaries(),
        proposals: listImprovementProposals(),
        versions: listImprovementVersions(),
      });
    }
    if (resource === "runtime") {
      const { isOrchestratorDaemonEnabled, readDaemonHealthFile } = await import("../../../../../../../backend/orchestrator/daemon");
      const { getOrchestratorPersistDir } = await import("../../../../../../../backend/orchestrator/persistentStore");
      const { isEmergencyStopped, getGlobalOperationMode } = await import("../../../../../../../backend/agents/workforce/operationModes");
      const healthDir = process.env.NELVYON_ORCH_HEALTH_DIR?.trim() || getOrchestratorPersistDir();
      return NextResponse.json({
        daemonEnabled: isOrchestratorDaemonEnabled(),
        emergencyStop: isEmergencyStopped(),
        operationMode: getGlobalOperationMode(),
        persistDir: getOrchestratorPersistDir(),
        health: healthDir ? readDaemonHealthFile(healthDir) : null,
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
