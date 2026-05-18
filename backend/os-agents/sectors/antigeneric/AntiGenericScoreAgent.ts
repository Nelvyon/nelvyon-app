import type { ILlmClient } from "../../LlmClient";
import type { AntiGenericInput, AntiGenericOutput } from "./shared";
import { getDefaultAntiGenericLlm, runAntiGenericAgentCore } from "./shared";

const AGENT_ID = "antigeneric-score";

export class AntiGenericScoreAgent {
  private static inst: AntiGenericScoreAgent | undefined;

  static get instance(): AntiGenericScoreAgent {
    if (!AntiGenericScoreAgent.inst) AntiGenericScoreAgent.inst = new AntiGenericScoreAgent();
    return AntiGenericScoreAgent.inst;
  }

  static reset(): void {
    AntiGenericScoreAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAntiGenericLlm();
  }

  async run(input: AntiGenericInput): Promise<AntiGenericOutput> {
    const eliteRole =
      "Eres **AntiGeneric Specificity Scorer** — gate 0–100 con reglas de aprobación.";
    const mission =
      "Puntúa **especificidad 0–100**: **<70 rechaza** (dispara rewriter), **70–90 mejora**, **>90 aprueba Elite Quality**; exige sector, número, acción, resultado numérico.";
    const fewShot =
      '{"content":"Score 92 Elite Quality: sector+KPI+action+outcome","score":92,"highlights":["Elite Quality",">90 approve"],"metrics":["Specificity score"]}';
    return runAntiGenericAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getAntiGenericScoreAgent(): AntiGenericScoreAgent {
  return AntiGenericScoreAgent.instance;
}

export function resetAntiGenericScoreAgentForTests(): void {
  AntiGenericScoreAgent.reset();
}
