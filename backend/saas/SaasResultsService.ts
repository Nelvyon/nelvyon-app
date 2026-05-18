import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

export interface ServiceResult {
  id: string;
  userId: string;
  tenantId: string;
  jobId?: string;
  serviceId: string;
  serviceName: string;
  summary: string;
  details: Record<string, unknown>;
  assetUrls: string[];
  status: "completed" | "partial" | "failed";
  createdAt: string;
}

export type SaasResultsServiceDeps = {
  db?: Pick<DbClient, "query">;
};

export class SaasResultsService {
  constructor(private readonly deps: SaasResultsServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async saveResult(params: Omit<ServiceResult, "id" | "createdAt">): Promise<ServiceResult> {
    const rows = await this.db.query<ServiceResult>(
      `INSERT INTO saas_service_results
         (user_id, tenant_id, job_id, service_id, service_name, summary, details, asset_urls, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
       RETURNING id, user_id as "userId", tenant_id as "tenantId", job_id as "jobId",
                 service_id as "serviceId", service_name as "serviceName", summary,
                 details, asset_urls as "assetUrls", status, created_at as "createdAt"`,
      [
        params.userId,
        params.tenantId,
        params.jobId ?? null,
        params.serviceId,
        params.serviceName,
        params.summary,
        JSON.stringify(params.details),
        JSON.stringify(params.assetUrls),
        params.status,
      ],
    );
    const row = rows[0];
    if (!row) {
      throw new Error("SaasResultsService.saveResult: INSERT returned no row");
    }
    logger.info(`[RESULTS] Resultado guardado: ${params.serviceId} para ${params.userId}`);
    return row;
  }

  async getResults(params: {
    userId: string;
    tenantId: string;
    serviceId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ results: ServiceResult[]; total: number }> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);

    let where = `WHERE user_id = $1 AND tenant_id = $2`;
    const args: unknown[] = [params.userId, params.tenantId];

    if (params.serviceId) {
      args.push(params.serviceId);
      where += ` AND service_id = $${args.length}`;
    }
    if (params.status) {
      args.push(params.status);
      where += ` AND status = $${args.length}`;
    }

    const countRows = await this.db.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM saas_service_results ${where}`, args);
    const total = parseInt(countRows[0]?.count ?? "0", 10);

    const dataArgs = [...args, limit, offset];
    const results = await this.db.query<ServiceResult>(
      `SELECT id, user_id as "userId", tenant_id as "tenantId", job_id as "jobId",
              service_id as "serviceId", service_name as "serviceName", summary,
              details, asset_urls as "assetUrls", status, created_at as "createdAt"
       FROM saas_service_results ${where}
       ORDER BY created_at DESC LIMIT $${dataArgs.length - 1} OFFSET $${dataArgs.length}`,
      dataArgs,
    );

    return { results, total };
  }

  async getResultById(id: string, userId: string): Promise<ServiceResult | null> {
    const rows = await this.db.query<ServiceResult>(
      `SELECT id, user_id as "userId", tenant_id as "tenantId", job_id as "jobId",
              service_id as "serviceId", service_name as "serviceName", summary,
              details, asset_urls as "assetUrls", status, created_at as "createdAt"
       FROM saas_service_results WHERE id = $1::uuid AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ?? null;
  }
}

export const saasResultsService = new SaasResultsService();
