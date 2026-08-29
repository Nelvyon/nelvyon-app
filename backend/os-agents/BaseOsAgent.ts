import type { OsAgentStep, OsJobContext, OsJobPayload, OsJobResult, OsStepResultRecord } from "./types";
import { NelvyonMonitor } from "../monitoring";
import { watermarkOsJobResult } from "./watermark";
import { construirEntregable, yaTieneEntregable } from "./artifacts/entregableDeServicio";
import { publishArtifactZip } from "./artifacts/artifactPublisher";

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

    // ── EL ENTREGABLE ────────────────────────────────────────────────────
    //
    // De los veinticinco servicios que NELVYON vende, ocho terminan produciendo
    // un fichero que el cliente puede abrir. Los otros diecisiete terminaban en
    // TEXTO: la salida del ultimo paso, en JSON, dentro del resultado del
    // trabajo. Eso no es un entregable, es materia prima de un entregable.
    //
    // Aqui, y no en cada agente, porque son diecisiete ficheros y este es el
    // unico sitio por el que pasan todos.
    //
    // NO se envuelve lo que ya trae su propio artefacto: darle al cliente dos
    // ficheros que dicen lo mismo, y el peor de los dos primero, es peor que
    // darle uno.
    let entregable: { downloadUrl: string; fileCount: number } | undefined;
    if (!yaTieneEntregable(stepResults)) {
      try {
        const files = construirEntregable({
          serviceId: this.serviceId,
          cliente: typeof payload.clientName === "string" ? payload.clientName : undefined,
          jobId: ctx.jobId,
          pasos: stepResults,
        });
        const publicado = await publishArtifactZip({
          kind: "sector-report",
          clientId: ctx.clientId,
          tenantId: typeof payload.tenantId === "string" ? payload.tenantId : ctx.clientId,
          jobId: ctx.jobId,
          serviceId: this.serviceId,
          files,
          zipFileName: `nelvyon-${this.serviceId}.zip`,
        });
        entregable = { downloadUrl: publicado.downloadUrl, fileCount: publicado.fileCount };
      } catch (err) {
        // UN FALLO AQUI NO TUMBA EL TRABAJO. Los pasos ya se hicieron y su
        // contenido esta guardado; perder eso por no poder escribir un zip
        // seria cambiar un problema de entrega por uno de produccion.
        NelvyonMonitor.trackAgentError(this.constructor.name, "entregable", err);
      }
    }

    const result: OsJobResult = watermarkOsJobResult({
      serviceId: this.serviceId,
      steps: stepResults,
      ...(entregable ? { entregable } : {}),
    });
    await ctx.jobStore.completeJob(ctx.jobId, result);
    ctx.eventBus.emit("job:completed", { jobId: ctx.jobId, result });
    return result;
  }
}

function summarizeStepLog(data: string): string {
  return data.slice(0, 400);
}
