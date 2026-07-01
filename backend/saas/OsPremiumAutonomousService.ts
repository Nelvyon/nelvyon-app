import { OS_PREMIUM_SERVICE_IDS } from "../os-agents/constants";
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
  }): Promise<OsAutonomousKickoffResult> {
    if (!OS_PREMIUM_SERVICE_IDS.includes(params.serviceId as typeof OS_PREMIUM_SERVICE_IDS[number])) {
      return { serviceId: params.serviceId, status: "skipped" };
    }
    const jobId = `auto_${params.serviceId}_${Date.now()}`;
    await this.db.query(
      `INSERT INTO os_jobs (job_id, service_id, client_id, status, steps, result)
       VALUES ($1, $2, $3, 'queued', '[]', $4)`,
      [jobId, params.serviceId, String(params.workspaceId), JSON.stringify({ ...params.intake, tenantId: params.tenantId, autonomous: true })],
    );
    return { serviceId: params.serviceId, status: "queued", jobId };
  }

  async enqueueAll(params: {
    tenantId: string;
    workspaceId: number;
    intake: Record<string, unknown>;
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
