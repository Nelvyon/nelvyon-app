import type { ILlmClient } from "../../LlmClient";
import type { DemoInput, DemoOutput } from "./shared";
import { getDefaultDemoLlm, runDemoAgentCore } from "./shared";

const AGENT_ID = "demo-personalization";

export class DemoPersonalizationAgent {
  private static inst: DemoPersonalizationAgent | undefined;

  static get instance(): DemoPersonalizationAgent {
    if (!DemoPersonalizationAgent.inst) DemoPersonalizationAgent.inst = new DemoPersonalizationAgent();
    return DemoPersonalizationAgent.inst;
  }

  static reset(): void {
    DemoPersonalizationAgent.inst = undefined;
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
          "ROLE: PLG demo personalizer top 1%; experiencia sin login que se siente hecha a medida.",
        mission:
          "Personaliza la demo en tiempo real según perfil del visitante: rutas, highlights y orden de features.",
        fewShotExample:
          "Input: SMB vs enterprise hint. Output JSON: demoSteps ramas; ctaMessages por segmento.",
      },
      input,
      0.5,
    );
  }
}

export function getDemoPersonalizationAgent(): DemoPersonalizationAgent {
  return DemoPersonalizationAgent.instance;
}

export function resetDemoPersonalizationAgentForTests(): void {
  DemoPersonalizationAgent.reset();
}
