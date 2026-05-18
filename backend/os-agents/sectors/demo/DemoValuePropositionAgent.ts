import type { ILlmClient } from "../../LlmClient";
import type { DemoInput, DemoOutput } from "./shared";
import { getDefaultDemoLlm, runDemoAgentCore } from "./shared";

const AGENT_ID = "demo-value-proposition";

export class DemoValuePropositionAgent {
  private static inst: DemoValuePropositionAgent | undefined;

  static get instance(): DemoValuePropositionAgent {
    if (!DemoValuePropositionAgent.inst) DemoValuePropositionAgent.inst = new DemoValuePropositionAgent();
    return DemoValuePropositionAgent.inst;
  }

  static reset(): void {
    DemoValuePropositionAgent.inst = undefined;
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
          "ROLE: Value prop architect top 1%; claridad en 10 segundos para anónimos.",
        mission:
          "Construye propuesta de valor específica para el perfil del visitante; bullets y prueba social ligera.",
        fewShotExample:
          "Input: pain ahorro tiempo. Output JSON: demoSteps hero→prueba; ctaMessages trial sin tarjeta.",
      },
      input,
      0.5,
    );
  }
}

export function getDemoValuePropositionAgent(): DemoValuePropositionAgent {
  return DemoValuePropositionAgent.instance;
}

export function resetDemoValuePropositionAgentForTests(): void {
  DemoValuePropositionAgent.reset();
}
