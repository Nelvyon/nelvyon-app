export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getAgentOrchestrator,
  isOrchestratorEnabled,
  ORCHESTRATOR_CONTRACT_VERSION,
  ORCHESTRATOR_RESILIENCE,
  OrchestratorNotEnabledError,
  InMemoryAgentOrchestrator,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") ?? "status";

    if (resource === "status") {
      return NextResponse.json({
        enabled: isOrchestratorEnabled(),
        contractVersion: ORCHESTRATOR_CONTRACT_VERSION,
        resilience: ORCHESTRATOR_RESILIENCE,
        rollback: "NELVYON_ORCHESTRATOR_ENABLED=0",
      });
    }

    if (!isOrchestratorEnabled()) {
      throw new OrchestratorNotEnabledError();
    }

    if (resource === "jobs") {
      const orch = getAgentOrchestrator();
      const jobs =
        orch instanceof InMemoryAgentOrchestrator
          ? orch.listJobs(ctx.tenant.id, Number(url.searchParams.get("limit") ?? 50))
          : [];
      return NextResponse.json({ jobs });
    }

    if (resource === "get") {
      const id = url.searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const job = await getAgentOrchestrator().getJob(ctx.tenant.id, id);
      if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ job });
    }

    return NextResponse.json({ error: "unknown_resource" }, { status: 400 });
  } catch (e: unknown) {
    const status = e instanceof OrchestratorNotEnabledError ? 503 : saasErrorStatus(e);
    return NextResponse.json(saasErrorBody(e), { status });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    if (!isOrchestratorEnabled()) throw new OrchestratorNotEnabledError();
    const body = (await req.json()) as Record<string, unknown>;
    const orch = getAgentOrchestrator();
    const action = String(body.action ?? "enqueue");

    if (action === "coordinate") {
      const agents = Array.isArray(body.agents) ? (body.agents as string[]) : ["ceo_supervisor"];
      const correlationId = await orch.coordinate(
        ctx.tenant.id,
        {
          pattern: (body.pattern as "sequential") ?? "sequential",
          agents,
          timeoutMs: Number(body.timeoutMs ?? 60_000),
          requireAllSuccess: Boolean(body.requireAllSuccess ?? false),
        },
        String(body.input ?? ""),
      );
      return NextResponse.json({ correlationId }, { status: 201 });
    }

    const jobId = await orch.enqueue({
      tenantId: ctx.tenant.id,
      agentId: String(body.agentId ?? "ceo_supervisor"),
      correlationId: String(body.correlationId ?? crypto.randomUUID()),
      traceId: String(body.traceId ?? crypto.randomUUID()),
      priority: Number(body.priority ?? 50),
      payload: (body.payload as Record<string, unknown>) ?? {},
      maxAttempts: Number(body.maxAttempts ?? 5),
      scheduledAt: new Date().toISOString(),
      parentJobId: (body.parentJobId as string) ?? null,
    });
    return NextResponse.json({ jobId }, { status: 201 });
  } catch (e: unknown) {
    const status = e instanceof OrchestratorNotEnabledError ? 503 : saasErrorStatus(e);
    return NextResponse.json(saasErrorBody(e), { status });
  }
}
