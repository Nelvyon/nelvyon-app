import type { DbClient } from "../db/DbClient";
import type { RedisClient } from "../db/RedisClient";
import { OS_JOB_REDIS_TTL_SECONDS } from "../db/RedisClient";
import type { IOsJobStore } from "./types";
import type { OsJob, OsJobPayload, OsJobResult, OsJobStatus, OsJobStepState } from "./types";

/**
 * Persists OS jobs to Postgres (source of truth) and caches active jobs in Redis for fast reads.
 * Exists so orchestration stays unchanged while swapping in durable storage and optional hot cache.
 * Depends on DbClient; RedisClient is optional — when null, all reads/writes go to Postgres only.
 */
export class OsJobStorePersistent implements IOsJobStore {
  constructor(
    private readonly db: DbClient,
    private readonly redis: RedisClient | null,
  ) {}

  async createJob(job: OsJob): Promise<void> {
    await this.insertPostgres(job);
    await this.cacheJobSafe(job);
  }

  async updateJobStatus(
    jobId: string,
    status: OsJobStatus,
    progress: number,
    steps: OsJobStepState[],
    result?: OsJobResult,
    errorText?: string | null,
    payload?: OsJobPayload,
    intake?: OsJob["intake"],
  ): Promise<void> {
    await this.updatePostgres(jobId, status, progress, steps, result, errorText ?? null, payload, intake);
    const job = await this.getJobFromPostgres(jobId);
    if (job) {
      await this.syncRedisAfterWrite(job);
    }
  }

  async getJob(jobId: string): Promise<OsJob | null> {
    if (this.redis) {
      try {
        const cached = await this.redis.get(redisKey(jobId));
        if (cached) {
          const parsed = parseJobJson(cached);
          if (parsed) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn("[OsJobStorePersistent] Redis get failed; falling back to Postgres.", e);
      }
    }

    const job = await this.getJobFromPostgres(jobId);
    if (job && this.redis && isActiveStatus(job.status)) {
      try {
        await this.redis.set(redisKey(jobId), JSON.stringify(job), OS_JOB_REDIS_TTL_SECONDS);
      } catch (e) {
        console.warn("[OsJobStorePersistent] Redis recache after Postgres read failed.", e);
      }
    }
    return job;
  }

  async listJobs(clientId?: string): Promise<OsJob[]> {
    const rows =
      clientId === undefined || clientId.length === 0
        ? await this.db.query<OsJobRow>(
            `SELECT job_id, service_id, client_id, status, progress, steps, payload, intake, result, error, created_at, updated_at
             FROM os_jobs ORDER BY created_at DESC`,
          )
        : await this.db.query<OsJobRow>(
            `SELECT job_id, service_id, client_id, status, progress, steps, payload, intake, result, error, created_at, updated_at
             FROM os_jobs WHERE client_id = $1 ORDER BY created_at DESC`,
            [clientId],
          );
    return rows.map(rowToOsJob);
  }

  private async insertPostgres(job: OsJob): Promise<void> {
    await this.db.query(
      `INSERT INTO os_jobs (job_id, service_id, client_id, status, progress, steps, payload, intake, result, error, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11::timestamptz, $12::timestamptz)`,
      [
        job.jobId,
        job.serviceId,
        job.clientId,
        job.status,
        job.progress,
        JSON.stringify(job.steps),
        JSON.stringify(job.payload),
        job.intake === undefined ? null : JSON.stringify(job.intake),
        job.result === undefined ? null : JSON.stringify(job.result),
        serializeErrorColumn(job.error),
        job.createdAt,
        job.updatedAt,
      ],
    );
  }

  private async updatePostgres(
    jobId: string,
    status: OsJobStatus,
    progress: number,
    steps: OsJobStepState[],
    result: OsJobResult | undefined,
    errorText: string | null,
    payload: OsJobPayload | undefined,
    intake: OsJob["intake"] | undefined,
  ): Promise<void> {
    await this.db.query(
      `UPDATE os_jobs
       SET status = $2, progress = $3, steps = $4::jsonb, result = $5::jsonb, error = $6,
           payload = COALESCE($7::jsonb, payload),
           intake = COALESCE($8::jsonb, intake),
           updated_at = now()
       WHERE job_id = $1`,
      [
        jobId,
        status,
        progress,
        JSON.stringify(steps),
        result === undefined ? null : JSON.stringify(result),
        errorText,
        payload === undefined ? null : JSON.stringify(payload),
        intake === undefined ? null : JSON.stringify(intake),
      ],
    );
  }

  private async getJobFromPostgres(jobId: string): Promise<OsJob | null> {
    const rows = await this.db.query<OsJobRow>(
      `SELECT job_id, service_id, client_id, status, progress, steps, payload, intake, result, error, created_at, updated_at
       FROM os_jobs WHERE job_id = $1 LIMIT 1`,
      [jobId],
    );
    const row = rows[0];
    return row ? rowToOsJob(row) : null;
  }

  private async cacheJobSafe(job: OsJob): Promise<void> {
    if (!this.redis) return;
    try {
      if (isActiveStatus(job.status)) {
        await this.redis.set(redisKey(job.jobId), JSON.stringify(job), OS_JOB_REDIS_TTL_SECONDS);
      }
    } catch (e) {
      console.warn("[OsJobStorePersistent] Redis set on createJob failed; job remains in Postgres.", e);
    }
  }

  private async syncRedisAfterWrite(job: OsJob): Promise<void> {
    if (!this.redis) return;
    try {
      if (isActiveStatus(job.status)) {
        await this.redis.set(redisKey(job.jobId), JSON.stringify(job), OS_JOB_REDIS_TTL_SECONDS);
      } else {
        await this.redis.del(redisKey(job.jobId));
      }
    } catch (e) {
      console.warn("[OsJobStorePersistent] Redis sync after update failed.", e);
    }
  }
}

interface OsJobRow {
  job_id: string;
  service_id: string;
  client_id: string;
  status: string;
  progress: number;
  steps: unknown;
  payload: unknown;
  intake: unknown;
  result: unknown;
  error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function redisKey(jobId: string): string {
  return `os:job:${jobId}`;
}

function isActiveStatus(status: OsJobStatus): boolean {
  return status === "queued" || status === "running";
}

function serializeErrorColumn(error: OsJob["error"]): string | null {
  if (!error) return null;
  return JSON.stringify(error);
}

function parseErrorColumn(text: string | null): OsJob["error"] {
  if (!text || text.length === 0) return undefined;
  try {
    const v: unknown = JSON.parse(text);
    if (typeof v === "object" && v !== null && "message" in v && typeof (v as { message: unknown }).message === "string") {
      const o = v as { message: string; step?: string };
      return { message: o.message, step: o.step };
    }
  } catch {
    return { message: text };
  }
  return { message: text };
}

function rowToOsJob(row: OsJobRow): OsJob {
  const status = row.status as OsJobStatus;
  const steps = Array.isArray(row.steps) ? (row.steps as OsJobStepState[]) : [];
  const result = parseResultColumn(row.result);
  return {
    jobId: row.job_id,
    serviceId: row.service_id,
    clientId: row.client_id,
    status,
    progress: row.progress,
    steps,
    payload: parsePayloadColumn(row.payload),
    result,
    error: parseErrorColumn(row.error),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function parsePayloadColumn(v: unknown): OsJobPayload {
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    return v as OsJobPayload;
  }
  return {};
}

function parseIntakeColumn(v: unknown): OsJob["intake"] | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object" && !Array.isArray(v)) {
    return v as OsJob["intake"];
  }
  return undefined;
}

function toIso(v: Date | string): string {
  if (v instanceof Date) return v.toISOString();
  return typeof v === "string" ? v : new Date(v).toISOString();
}

function parseResultColumn(v: unknown): OsJobResult | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") {
    try {
      const parsed: unknown = JSON.parse(v);
      if (typeof parsed === "object" && parsed !== null && "steps" in parsed) {
        return parsed as OsJobResult;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (typeof v === "object" && v !== null && "steps" in v) {
    return v as OsJobResult;
  }
  return undefined;
}

function parseJobJson(raw: string): OsJob | null {
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const o = v as Record<string, unknown>;
    if (
      typeof o.jobId === "string" &&
      typeof o.serviceId === "string" &&
      typeof o.clientId === "string" &&
      typeof o.status === "string" &&
      typeof o.progress === "number" &&
      Array.isArray(o.steps) &&
      typeof o.createdAt === "string" &&
      typeof o.updatedAt === "string"
    ) {
      const intakeRaw = o.intake;
      const intakeParsed = parseIntakeColumn(intakeRaw);
      return {
        jobId: o.jobId,
        serviceId: o.serviceId,
        clientId: o.clientId,
        status: o.status as OsJobStatus,
        progress: o.progress,
        steps: o.steps as OsJobStepState[],
        payload: parsePayloadColumn(o.payload),
        ...(intakeParsed !== undefined ? { intake: intakeParsed } : {}),
        result: o.result === undefined ? undefined : (o.result as OsJobResult),
        error: o.error === undefined ? undefined : (o.error as OsJob["error"]),
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      };
    }
  } catch {
    return null;
  }
  return null;
}
