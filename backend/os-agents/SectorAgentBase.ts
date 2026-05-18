import { BaseOsAgent } from "./BaseOsAgent";
import {
  buildSectorReportFiles,
  collectStepOutputs,
  publishSectorReportZip,
} from "./artifacts/sectorReportBuilder";
import { NelvyonMonitor } from "../monitoring";
import type { OsAgentStep, OsJobContext, OsJobPayload, OsJobResult, OsStepResultRecord } from "./types";
import { watermarkOsJobResult } from "./watermark";

export const SECTOR_ARTIFACT_PUBLISH_STEP = "artifact_publish";

function tenantIdFrom(payload: OsJobPayload, ctx: OsJobContext): string {
  const fromPayload = payload.tenantId;
  if (typeof fromPayload === "string" && fromPayload.trim()) return fromPayload.trim();
  return ctx.clientId;
}

function summarizeStepLog(data: string): string {
  return data.slice(0, 400);
}

/**
 * Base OS agent for sector services — appends `artifact_publish` (ZIP informe HTML)
 * when `artifactEnabled` is true (default).
 */
export abstract class SectorAgentBase extends BaseOsAgent {
  readonly artifactEnabled: boolean = true;

  protected resolveSteps(): OsAgentStep[] {
    const core = this.steps;
    if (!this.artifactEnabled) return core;
    if (core.some((s) => s.name === SECTOR_ARTIFACT_PUBLISH_STEP)) return core;
    return [...core, this.buildArtifactPublishStep()];
  }

  protected buildArtifactPublishStep(): OsAgentStep {
    return {
      name: SECTOR_ARTIFACT_PUBLISH_STEP,
      description: "Empaqueta informe sectorial en ZIP descargable",
      run: async (payload, ctx) => {
        const outputs = collectStepOutputs(ctx.stepResults);
        const files = buildSectorReportFiles(outputs.length ? outputs : ctx.stepResults, payload);
        const published = await publishSectorReportZip({
          clientId: ctx.clientId,
          tenantId: tenantIdFrom(payload, ctx),
          jobId: ctx.jobId,
          serviceId: ctx.serviceId,
          files,
        });
        return JSON.stringify(published);
      },
    };
  }

  override async execute(payload: OsJobPayload, ctx: OsJobContext): Promise<OsJobResult> {
    const stepsToRun = this.resolveSteps();
    const stepResults: OsStepResultRecord[] = [];
    const total = stepsToRun.length;

    for (let i = 0; i < total; i++) {
      const step = stepsToRun[i]!;
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
