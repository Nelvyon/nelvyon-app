import type { OsAgentStep, OsJobContext, OsJobPayload, OsJobResult, OsStepResultRecord } from "./types";
import { NelvyonMonitor } from "../monitoring";
import { watermarkOsJobResult } from "./watermark";

export abstract class BaseOsAgent {
  abstract readonly serviceId: string;
  abstract readonly steps: OsAgentStep[];

  async execute(payload: OsJobPayload, ctx: OsJobContext): Promise<OsJobResult> {
    const stepResults: OsStepResultRecord[] = [];
    const total = this.steps.length;

    for (let i = 0; i < total; i++) {
      const step = this.steps[i];
      await ctx.jobStore.markStepRunning(ctx.jobId, i);
      ctx.eventBus.emit("job:progress", {
        jobId: ctx.jobId,
        progress: Math.round((i / total) * 100),
        stepName: step.name,
      });

      try {
        const text = await step.run(payload, ctx);
        ctx.stepResults[step.name] = text;
        stepResults.push({ name: step.name, data: { output: text } });
        const logLine = summarizeStepLog(text);
        await ctx.jobStore.markStepCompleted(ctx.jobId, i, logLine);
        const progressAfter = Math.round(((i + 1) / total) * 100);
        await ctx.jobStore.updateJobProgress(ctx.jobId, progressAfter);
        ctx.eventBus.emit("job:progress", {
          jobId: ctx.jobId,
          progress: progressAfter,
          stepName: step.name,
        });
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        const message = `${step.name}: ${raw}`;
        NelvyonMonitor.trackAgentError(this.constructor.name, step.name, err);
        await ctx.jobStore.markStepFailed(ctx.jobId, i, message);
        await ctx.jobStore.failJob(ctx.jobId, message, step.name);
        ctx.eventBus.emit("job:failed", {
          jobId: ctx.jobId,
          error: { message, step: step.name },
        });
        throw err;
      }
    }

    const result: OsJobResult = watermarkOsJobResult({ serviceId: this.serviceId, steps: stepResults });
    await ctx.jobStore.completeJob(ctx.jobId, result);
    ctx.eventBus.emit("job:completed", { jobId: ctx.jobId, result });
    return result;
  }
}

function summarizeStepLog(data: string): string {
  return data.slice(0, 400);
}
