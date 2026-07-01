import { OS_PREMIUM_SERVICE_IDS } from "../os-agents/constants";
import { osOrchestrator } from "../os-agents/OsOrchestrator";
import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type OsAutonomousKickoffResult = {
  serviceId: string;
  status: "queued" | "skipped";
  jobId?: string;
};

/** Queue autonomous OS execution for all premium services (C33). */
export class OsPremiumAutonomousService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  listServiceIds(): string[] {
    return [...OS_PREMIUM_SERVICE_IDS];
  }

  async queueAutonomousRun(params: {
    tenantId: string;
    serviceId: string;
    workspaceId: number;
    intake: Record<string, unknown>;
    userId?: string;
  }): Promise<OsAutonomousKickoffResult> {
    if (!OS_PREMIUM_SERVICE_IDS.includes(params.serviceId as typeof OS_PREMIUM_SERVICE_IDS[number])) {
      return { serviceId: params.serviceId, status: "skipped" };
    }
    const jobId = `auto_${params.serviceId}_${Date.now()}`;
    const result = await osOrchestrator.enqueueAndDispatch({
      serviceId: params.serviceId,
      clientId: String(params.workspaceId),
      payload: { ...params.intake, tenantId: params.tenantId, autonomous: true },
      jobId,
      userId: params.userId,
    });
    if (result.status === "failed") {
      return { serviceId: params.serviceId, status: "skipped" };
    }
    return { serviceId: params.serviceId, status: "queued", jobId: result.jobId || jobId };
  }

  async enqueueAll(params: {
    tenantId: string;
    workspaceId: number;
    intake: Record<string, unknown>;
    userId?: string;
  }): Promise<OsAutonomousKickoffResult[]> {
    const out: OsAutonomousKickoffResult[] = [];
    for (const serviceId of this.listServiceIds()) {
      out.push(await this.queueAutonomousRun({ ...params, serviceId }));
    }
    return out;
  }
}

let _svc: OsPremiumAutonomousService | undefined;
export function getOsPremiumAutonomousService(): OsPremiumAutonomousService {
  if (!_svc) _svc = new OsPremiumAutonomousService();
  return _svc;
}
