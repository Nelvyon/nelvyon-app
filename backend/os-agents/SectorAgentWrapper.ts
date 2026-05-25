import { SectorAgentBase } from "./SectorAgentBase";
import { resolveAgentLocale } from "./agentLanguage";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "./types";

export const SECTOR_EXECUTE_STEP = "sector_execute";

/** Adapta una función core de sector (runXxxAgentCore o agente legacy) al pipeline OS. */
export type SectorCoreExecutor = (payload: OsJobPayload, ctx: OsJobContext) => Promise<unknown>;

export interface SectorAgentWrapperOptions {
  serviceId: string;
  executor: SectorCoreExecutor;
  stepName?: string;
  description?: string;
}

/**
 * Envuelve la lógica existente de un sector sin modificar agentes internos.
 * Añade automáticamente `artifact_publish` vía {@link SectorAgentBase}.
 */
export class SectorAgentWrapper extends SectorAgentBase {
  readonly serviceId: string;
  readonly steps: OsAgentStep[];

  constructor(options: SectorAgentWrapperOptions) {
    super();
    this.serviceId = options.serviceId;
    const stepName = options.stepName ?? SECTOR_EXECUTE_STEP;
    this.steps = [
      {
        name: stepName,
        description:
          options.description ??
          `Ejecuta el agente de sector (${options.serviceId}) y serializa la salida para el informe.`,
        run: async (payload, ctx) => {
          const locale = resolveAgentLocale(payload as Record<string, unknown>);
          (ctx as OsJobContext & { agentLocale?: string }).agentLocale = locale;
          const result = await options.executor(payload, ctx);
          return typeof result === "string" ? result : JSON.stringify(result);
        },
      },
    ];
  }
}
