import type { ILlmClient } from "../../LlmClient";
import type { FranquiciasInput, FranquiciasOutput } from "./shared";
import { getDefaultFranquiciasLlm, runFranquiciasAgentCore } from "./shared";

const AGENT_ID = "franquicias-reviews";

export class FranquiciasReviewsAgent {
  private static inst: FranquiciasReviewsAgent | undefined;

  static get instance(): FranquiciasReviewsAgent {
    if (!FranquiciasReviewsAgent.inst) FranquiciasReviewsAgent.inst = new FranquiciasReviewsAgent();
    return FranquiciasReviewsAgent.inst;
  }

  static reset(): void {
    FranquiciasReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFranquiciasLlm();
  }

  async run(input: FranquiciasInput): Promise<FranquiciasOutput> {
    const eliteRole = "Eres **Franquicias Reviews** — cadena y locales.";
    const mission = "Estructura **reputación de cadena** y **gestión de reviews por local** con respuestas y KPIs.";
    const fewShot =
      '{"result":"Reviews cadena + por local franquicia","score":92,"recommendations":["Dashboard NPS","Respuesta 24h"]}';
    return runFranquiciasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFranquiciasReviewsAgent(): FranquiciasReviewsAgent {
  return FranquiciasReviewsAgent.instance;
}

export function resetFranquiciasReviewsAgentForTests(): void {
  FranquiciasReviewsAgent.reset();
}
