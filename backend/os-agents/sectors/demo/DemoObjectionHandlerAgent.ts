import type { ILlmClient } from "../../LlmClient";
import type { DemoInput, DemoOutput } from "./shared";
import { getDefaultDemoLlm, runDemoAgentCore } from "./shared";

const AGENT_ID = "demo-objection-handler";

export class DemoObjectionHandlerAgent {
  private static inst: DemoObjectionHandlerAgent | undefined;

  static get instance(): DemoObjectionHandlerAgent {
    if (!DemoObjectionHandlerAgent.inst) DemoObjectionHandlerAgent.inst = new DemoObjectionHandlerAgent();
    return DemoObjectionHandlerAgent.inst;
  }

  static reset(): void {
    DemoObjectionHandlerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDemoLlm();
  }

  async run(input: DemoInput): Promise<DemoOutput> {
    return runDemoAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Sales enablement coach top 1%; objeciones con empatía y datos del brief.",
        mission:
          "Prepara respuestas a objeciones frecuentes durante la demo; tono consultivo, no defensivo.",
        fewShotExample:
          "Input: '¿Y la integración?'. Output JSON: demoSteps mostrar conector; ctaMessages hablar con experto.",
      },
      input,
      0.5,
    );
  }
}

export function getDemoObjectionHandlerAgent(): DemoObjectionHandlerAgent {
  return DemoObjectionHandlerAgent.instance;
}

export function resetDemoObjectionHandlerAgentForTests(): void {
  DemoObjectionHandlerAgent.reset();
}
