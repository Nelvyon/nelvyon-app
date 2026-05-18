import { getEffectiveApiKey } from "../apikeys";
import { trackUsage } from "../usage/usageService";
import { enforceRateLimit, RateLimitExceededError } from "../usage/rateLimiter";
import { runWithOpenAiApiKey } from "./llmAsyncContext";
import type { StoredClientIntake } from "./intakeSchemas";
import { instantiateOsAgent } from "./OsAgentRegistry";
import { getOsQueue } from "./OsQueue";
import type { OsAgentStep, OsDispatchInput, OsDispatchResult, OsJobPayload, OsQueueItem } from "./types";
import { osEventBus } from "./OsEventBus";
import { initOsNotifier } from "./OsNotifier";
import { osJobStore } from "./OsJobStore";
import type { OsEventBus } from "./OsEventBus";
import type { OsJobStore } from "./OsJobStore";

function mergeJobPayloadWithIntake(payload: OsJobPayload, intake?: StoredClientIntake): OsJobPayload {
  if (!intake) return { ...payload };
  return { ...payload, ...intake };
}

export function sectorFromServiceId(serviceId: string): string {
  const i = serviceId.indexOf("_");
  return i > 0 ? serviceId.slice(0, i) : serviceId;
}

export class OsOrchestrator {
  constructor(
    private readonly jobStore: OsJobStore,
    private readonly eventBus: OsEventBus,
  ) {
    initOsNotifier(this.eventBus);
  }

  /**
   * Creates a job, enqueues it for the background worker, and returns immediately (HTTP-friendly).
   */
  async enqueueAndDispatch(
    input: OsDispatchInput,
    options?: { skipQueue?: boolean },
  ): Promise<OsDispatchResult> {
    const agent = instantiateOsAgent(input.serviceId);
    if (!agent) {
      return {
        jobId: "",
        status: "failed",
        message: `Unknown or unsupported serviceId: ${input.serviceId}`,
      };
    }

    if (input.userId) {
      await enforceRateLimit(input.userId);
    }

    const mergedPayload = mergeJobPayloadWithIntake(input.payload, input.intake);
    const job = await this.jobStore.createJob({
      serviceId: input.serviceId,
      clientId: input.clientId,
      steps: agent.steps.map((s: OsAgentStep) => ({ name: s.name, description: s.description })),
      payload: mergedPayload,
      intake: input.intake,
      ...(input.jobId ? { jobId: input.jobId } : {}),
    });

    this.eventBus.emit("job:created", {
      jobId: job.jobId,
      serviceId: job.serviceId,
      clientId: job.clientId,
    });

    const item: OsQueueItem = {
      jobId: job.jobId,
      serviceId: input.serviceId,
      clientId: input.clientId,
      payload: mergedPayload,
      enqueuedAt: new Date().toISOString(),
      ...(input.userId ? { userId: input.userId } : {}),
    };
    if (!options?.skipQueue) {
      await getOsQueue().enqueue(item);
    }

    return {
      jobId: job.jobId,
      status: "queued",
      message: "Job queued for background processing.",
    };
  }

  static async enqueueAndDispatch(
    input: OsDispatchInput,
    options?: { skipQueue?: boolean },
  ): Promise<OsDispatchResult> {
    return osOrchestrator.enqueueAndDispatch(input, options);
  }

  static async dispatch(input: OsDispatchInput): Promise<OsDispatchResult> {
    return osOrchestrator.dispatch(input);
  }

  /**
   * Executes a job already persisted as `queued` (used by `OsQueueWorker`).
   */
  async processQueuedJob(item: OsQueueItem): Promise<OsDispatchResult> {
    const agent = instantiateOsAgent(item.serviceId);
    if (!agent) {
      await this.jobStore.failJob(item.jobId, `Unknown or unsupported serviceId: ${item.serviceId}`, undefined);
      this.eventBus.emit("job:failed", {
        jobId: item.jobId,
        error: { message: `Unknown or unsupported serviceId: ${item.serviceId}` },
      });
      return {
        jobId: item.jobId,
        status: "failed",
        message: `Unknown or unsupported serviceId: ${item.serviceId}`,
      };
    }

    const existing = await this.jobStore.getJob(item.jobId);
    if (!existing) {
      return { jobId: item.jobId, status: "failed", message: "Job not found." };
    }
    if (existing.status !== "queued") {
      return {
        jobId: item.jobId,
        status: existing.status,
        message: `Job is ${existing.status}; worker skipped execution.`,
        skipped: true,
      };
    }

    if (item.userId) {
      try {
        await enforceRateLimit(item.userId);
      } catch (err) {
        if (err instanceof RateLimitExceededError) {
          const msg = "Has alcanzado el límite mensual de tu plan. Actualiza para continuar.";
          await this.jobStore.failJob(item.jobId, msg, undefined);
          this.eventBus.emit("job:failed", {
            jobId: item.jobId,
            error: { message: msg },
          });
          return {
            jobId: item.jobId,
            status: "failed",
            message: msg,
          };
        }
        throw err;
      }
    }

    await this.jobStore.updateJobStatus(item.jobId, "running");

    try {
      const payload: OsJobPayload = item.payload;
      const execJob = () =>
        agent.execute(payload, {
          jobId: item.jobId,
          clientId: item.clientId,
          serviceId: item.serviceId,
          payload,
          stepResults: {},
          jobStore: this.jobStore,
          eventBus: this.eventBus,
        });
      /** Watermark en `BaseOsAgent` antes de persistir resultado. */
      const result = item.userId
        ? await runWithOpenAiApiKey(await getEffectiveApiKey(item.userId, "openai"), execJob)
        : await execJob();
      if (item.userId) {
        try {
          await trackUsage(item.userId, item.serviceId, sectorFromServiceId(item.serviceId));
        } catch (err) {
          console.error("[usage] trackUsage failed:", err);
        }
      }
      return {
        jobId: item.jobId,
        status: "completed",
        message: "OS job completed successfully.",
        result,
      };
    } catch {
      const failed = await this.jobStore.getJob(item.jobId);
      const msg = failed?.error?.message ?? "Execution failed.";
      return {
        jobId: item.jobId,
        status: "failed",
        message: msg,
      };
    }
  }

  async dispatch(input: OsDispatchInput): Promise<OsDispatchResult> {
    const agent = instantiateOsAgent(input.serviceId);
    if (!agent) {
      return {
        jobId: "",
        status: "failed",
        message: `Unknown or unsupported serviceId: ${input.serviceId}`,
      };
    }

    if (input.userId) {
      await enforceRateLimit(input.userId);
    }

    const mergedPayload = mergeJobPayloadWithIntake(input.payload, input.intake);
    const job = await this.jobStore.createJob({
      serviceId: input.serviceId,
      clientId: input.clientId,
      steps: agent.steps.map((s: OsAgentStep) => ({ name: s.name, description: s.description })),
      payload: mergedPayload,
      intake: input.intake,
    });

    this.eventBus.emit("job:created", {
      jobId: job.jobId,
      serviceId: job.serviceId,
      clientId: job.clientId,
    });

    await this.jobStore.updateJobStatus(job.jobId, "running");

    try {
      const payload: OsJobPayload = mergedPayload;
      const execJob = () =>
        agent.execute(payload, {
          jobId: job.jobId,
          clientId: input.clientId,
          serviceId: input.serviceId,
          payload,
          stepResults: {},
          jobStore: this.jobStore,
          eventBus: this.eventBus,
        });
      /** Watermark en `BaseOsAgent` antes de persistir resultado. */
      const result = input.userId
        ? await runWithOpenAiApiKey(await getEffectiveApiKey(input.userId, "openai"), execJob)
        : await execJob();
      if (input.userId) {
        try {
          await trackUsage(input.userId, input.serviceId, sectorFromServiceId(input.serviceId));
        } catch (err) {
          console.error("[usage] trackUsage failed:", err);
        }
      }
      return {
        jobId: job.jobId,
        status: "completed",
        message: "OS job completed successfully.",
        result,
      };
    } catch {
      const failed = await this.jobStore.getJob(job.jobId);
      const msg = failed?.error?.message ?? "Execution failed.";
      return {
        jobId: job.jobId,
        status: "failed",
        message: msg,
      };
    }
  }
}

export const osOrchestrator = new OsOrchestrator(osJobStore, osEventBus);
