import { randomUUID } from "node:crypto";

import { DbClient } from "../db/DbClient";
import { RedisClient } from "../db/RedisClient";
import type { IOsJobStore, OsJob, OsJobPayload, OsJobResult, OsJobStatus, OsJobStepState } from "./types";

interface IntakeDraftRow {
  clientId: string;
  serviceId: string;
  data: Record<string, unknown>;
}
import { OsJobStoreMemory } from "./OsJobStoreMemory";
import { OsJobStorePersistent } from "./OsJobStorePersistent";

function nowIso(): string {
  return new Date().toISOString();
}

function serializeErrorForStore(job: OsJob): string | null {
  return job.error ? JSON.stringify(job.error) : null;
}

/**
 * Facade over IOsJobStore: granular job lifecycle API for OsOrchestrator/agents, backed by memory or Postgres+Redis.
 * Translates fine-grained mutations into full snapshots for IOsJobStore; use getOsJobStore() for env-based wiring.
 */
export class OsJobStore {
  private readonly intakeDrafts = new Map<string, IntakeDraftRow>();

  constructor(private readonly storage: IOsJobStore = new OsJobStoreMemory()) {}

  async createJob(params: {
    serviceId: string;
    clientId: string;
    steps: Array<{ name: string; description: string }>;
    payload?: OsJobPayload;
    intake?: OsJob["intake"];
    jobId?: string;
  }): Promise<OsJob> {
    const jobId = params.jobId ?? `os_${randomUUID()}`;
    const ts = nowIso();
    const steps: OsJobStepState[] = params.steps.map((s) => ({
      name: s.name,
      description: s.description,
      status: "pending",
    }));
    const payload = params.payload ?? {};
    const job: OsJob = {
      jobId,
      serviceId: params.serviceId,
      clientId: params.clientId,
      status: "queued",
      progress: 0,
      steps,
      payload,
      ...(params.intake !== undefined ? { intake: params.intake } : {}),
      createdAt: ts,
      updatedAt: ts,
    };
    await this.storage.createJob(job);
    return job;
  }

  async updateJobStatus(jobId: string, status: OsJobStatus): Promise<OsJob | undefined> {
    const job = await this.storage.getJob(jobId);
    if (!job) return undefined;
    job.status = status;
    job.updatedAt = nowIso();
    await this.persist(job);
    return job;
  }

  async updateJobProgress(jobId: string, progress: number): Promise<OsJob | undefined> {
    const job = await this.storage.getJob(jobId);
    if (!job) return undefined;
    job.progress = Math.min(100, Math.max(0, Math.round(progress)));
    job.updatedAt = nowIso();
    await this.persist(job);
    return job;
  }

  async markStepRunning(jobId: string, stepIndex: number): Promise<void> {
    const job = await this.storage.getJob(jobId);
    if (!job) return;
    const step = job.steps[stepIndex];
    if (!step) return;
    step.status = "running";
    job.updatedAt = nowIso();
    await this.persist(job);
  }

  async markStepCompleted(jobId: string, stepIndex: number, log?: string): Promise<void> {
    const job = await this.storage.getJob(jobId);
    if (!job) return;
    const step = job.steps[stepIndex];
    if (!step) return;
    step.status = "completed";
    if (log !== undefined) step.log = log;
    job.updatedAt = nowIso();
    await this.persist(job);
  }

  async markStepFailed(jobId: string, stepIndex: number, log: string): Promise<void> {
    const job = await this.storage.getJob(jobId);
    if (!job) return;
    const step = job.steps[stepIndex];
    if (!step) return;
    step.status = "failed";
    step.log = log;
    job.updatedAt = nowIso();
    await this.persist(job);
  }

  async completeJob(jobId: string, result: OsJobResult): Promise<OsJob | undefined> {
    const job = await this.storage.getJob(jobId);
    if (!job) return undefined;
    job.status = "completed";
    job.progress = 100;
    job.result = result;
    job.updatedAt = nowIso();
    await this.persist(job);
    return job;
  }

  async failJob(jobId: string, message: string, stepName?: string): Promise<OsJob | undefined> {
    const job = await this.storage.getJob(jobId);
    if (!job) return undefined;
    job.status = "failed";
    job.error = { message, step: stepName };
    job.updatedAt = nowIso();
    await this.persist(job);
    return job;
  }

  async getJob(jobId: string): Promise<OsJob | undefined> {
    const j = await this.storage.getJob(jobId);
    return j ?? undefined;
  }

  async listJobs(clientId?: string): Promise<OsJob[]> {
    return this.storage.listJobs(clientId);
  }

  /** Clears in-memory backing store (tests only; no-op for persistent). */
  async clear(): Promise<void> {
    this.intakeDrafts.clear();
    if (this.storage instanceof OsJobStoreMemory) {
      await this.storage.clear();
    }
  }

  /** Persists a validated intake draft until checkout completes (in-memory; keyed by `intakeId`). */
  saveIntakeDraft(clientId: string, serviceId: string, data: Record<string, unknown>): string {
    const intakeId = `int_${randomUUID()}`;
    this.intakeDrafts.set(intakeId, { clientId, serviceId, data });
    return intakeId;
  }

  getIntakeDraft(intakeId: string): IntakeDraftRow | undefined {
    const row = this.intakeDrafts.get(intakeId);
    return row ? { ...row, data: { ...row.data } } : undefined;
  }

  consumeIntakeDraft(intakeId: string): IntakeDraftRow | undefined {
    const row = this.intakeDrafts.get(intakeId);
    if (!row) return undefined;
    this.intakeDrafts.delete(intakeId);
    return { ...row, data: { ...row.data } };
  }

  private async persist(job: OsJob): Promise<void> {
    await this.storage.updateJobStatus(
      job.jobId,
      job.status,
      job.progress,
      job.steps,
      job.result,
      serializeErrorForStore(job),
      job.payload,
      job.intake,
    );
  }
}

/**
 * Factory helper: DATABASE_URL → Postgres-backed IOsJobStore (Redis cache when REDIS_URL is set);
 * otherwise in-memory IOsJobStore for dev/CI without DB. OsOrchestrator always receives the OsJobStore facade.
 */
function resolveStorage(): IOsJobStore {
  if (typeof process !== "undefined" && process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    const db = DbClient.getInstance();
    const redis =
      process.env.REDIS_URL && process.env.REDIS_URL.trim().length > 0 ? RedisClient.getInstance() : null;
    return new OsJobStorePersistent(db, redis);
  }
  return new OsJobStoreMemory();
}

let singletonStore: OsJobStore | undefined;

export function getOsJobStore(): OsJobStore {
  if (!singletonStore) {
    singletonStore = new OsJobStore(resolveStorage());
  }
  return singletonStore;
}

export const osJobStore = getOsJobStore();
