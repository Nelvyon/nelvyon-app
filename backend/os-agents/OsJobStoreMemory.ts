import type { IOsJobStore, OsJob, OsJobPayload, OsJobResult, OsJobStatus, OsJobStepState } from "./types";

/**
 * In-memory IOsJobStore for local/dev and CI when DATABASE_URL is absent.
 * Exists as a drop-in IOsJobStore implementation without external infrastructure; used by getOsJobStore() fallback.
 * Depends on none (pure Map).
 */
export class OsJobStoreMemory implements IOsJobStore {
  private readonly jobs = new Map<string, OsJob>();

  async createJob(job: OsJob): Promise<void> {
    this.jobs.set(job.jobId, { ...job, steps: job.steps.map((s) => ({ ...s })) });
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
    const existing = this.jobs.get(jobId);
    if (!existing) return;
    const error = deserializeErrorText(errorText);
    this.jobs.set(jobId, {
      ...existing,
      status,
      progress,
      steps: steps.map((s) => ({ ...s })),
      result,
      error,
      payload: payload ?? existing.payload,
      intake: intake !== undefined ? intake : existing.intake,
      updatedAt: new Date().toISOString(),
    });
  }

  async getJob(jobId: string): Promise<OsJob | null> {
    const j = this.jobs.get(jobId);
    return j ? cloneJob(j) : null;
  }

  async listJobs(clientId?: string): Promise<OsJob[]> {
    const all = [...this.jobs.values()];
    const filtered =
      clientId === undefined || clientId.length === 0 ? all : all.filter((j) => j.clientId === clientId);
    return filtered.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).map((j) => cloneJob(j));
  }

  async clear(): Promise<void> {
    this.jobs.clear();
  }
}

function cloneJob(j: OsJob): OsJob {
  return JSON.parse(JSON.stringify(j)) as OsJob;
}

function deserializeErrorText(text: string | null | undefined): OsJob["error"] {
  if (text === undefined || text === null || text.length === 0) return undefined;
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
