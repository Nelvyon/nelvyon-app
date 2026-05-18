import type { ILlmClient } from "../../LlmClient";
import type { AntiGenericInput, AntiGenericOutput } from "./shared";
import { getDefaultAntiGenericLlm, runAntiGenericAgentCore } from "./shared";

const AGENT_ID = "antigeneric-feedback";

export class AntiGenericFeedbackAgent {
  private static inst: AntiGenericFeedbackAgent | undefined;

  static get instance(): AntiGenericFeedbackAgent {
    if (!AntiGenericFeedbackAgent.inst) AntiGenericFeedbackAgent.inst = new AntiGenericFeedbackAgent();
    return AntiGenericFeedbackAgent.inst;
  }

  static reset(): void {
    AntiGenericFeedbackAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAntiGenericLlm();
  }

  async run(input: AntiGenericInput): Promise<AntiGenericOutput> {
    const eliteRole =
      "Eres **AntiGeneric Rejection Coach** — feedback accionable por fallo de especificidad.";
    const mission =
      "Genera **feedback específico** de por qué un output fue **rechazado** (frase prohibida, falta de KPI, tono incorrecto) y cómo corregirlo.";
    const fewShot =
      '{"content":"Rejected: banned phrase + missing numeric outcome; fix steps","score":85,"highlights":["Why rejected","Fix path"],"metrics":["Feedback clarity"]}';
    return runAntiGenericAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getAntiGenericFeedbackAgent(): AntiGenericFeedbackAgent {
  return AntiGenericFeedbackAgent.instance;
}

export function resetAntiGenericFeedbackAgentForTests(): void {
  AntiGenericFeedbackAgent.reset();
}
