import type { ILlmClient } from "../../LlmClient";
import type { AntiGenericInput, AntiGenericOutput } from "./shared";
import { getDefaultAntiGenericLlm, runAntiGenericAgentCore } from "./shared";

const AGENT_ID = "antigeneric-rewriter";

export class AntiGenericRewriterAgent {
  private static inst: AntiGenericRewriterAgent | undefined;

  static get instance(): AntiGenericRewriterAgent {
    if (!AntiGenericRewriterAgent.inst) AntiGenericRewriterAgent.inst = new AntiGenericRewriterAgent();
    return AntiGenericRewriterAgent.inst;
  }

  static reset(): void {
    AntiGenericRewriterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAntiGenericLlm();
  }

  async run(input: AntiGenericInput): Promise<AntiGenericOutput> {
    const eliteRole =
      "Eres **AntiGeneric Elite Rewriter** — convierte borradores rechazados en copy accionable.";
    const mission =
      "Reescribe outputs **genéricos** con **datos reales** del cliente/sector; sector nombrado, número, acción y resultado cuantificado.";
    const fewShot =
      '{"content":"Rewrite: clínica X +12% citas en 30d acción concreta","score":86,"highlights":["Sector named","Numeric outcome"],"metrics":["Specificity"]}';
    return runAntiGenericAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getAntiGenericRewriterAgent(): AntiGenericRewriterAgent {
  return AntiGenericRewriterAgent.instance;
}

export function resetAntiGenericRewriterAgentForTests(): void {
  AntiGenericRewriterAgent.reset();
}
