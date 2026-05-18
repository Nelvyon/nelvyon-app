import type { OsJobContext, OsJobPayload } from "./types";

const DEFAULT_ELITE_PARAMS = {
  eliteRole: "ROLE: Agente sectorial NELVYON OS — ejecución vía pipeline OS.",
  mission:
    "Analiza el brief del payload y entrega un informe accionable en JSON estructurado según el vertical.",
  fewShotExample:
    '{"content":"Análisis sectorial completo.","score":85,"recommendations":["Acción prioritaria 1"],"keywords":["kpi-sector"]}',
};

export function defaultSectorEliteParams(): typeof DEFAULT_ELITE_PARAMS {
  return { ...DEFAULT_ELITE_PARAMS };
}

/** Maps OsJobPayload + context into a sector agent input (sin alterar agentes existentes). */
export function buildSectorInputFromPayload(
  sector: string,
  payload: OsJobPayload,
  ctx: OsJobContext,
): Record<string, unknown> {
  const userId =
    typeof payload.userId === "string" && payload.userId.trim()
      ? payload.userId.trim()
      : ctx.clientId;
  const businessContext =
    typeof payload.businessContext === "string" && payload.businessContext.trim()
      ? payload.businessContext.trim()
      : typeof payload.brief === "string"
        ? payload.brief.trim()
        : "";
  const agentId =
    typeof payload.agentId === "string" && payload.agentId.trim()
      ? payload.agentId.trim()
      : `${sector}-os`;

  return {
    ...payload,
    userId,
    sector,
    businessContext,
    agentId,
    brief: typeof payload.brief === "string" ? payload.brief : businessContext,
  };
}
