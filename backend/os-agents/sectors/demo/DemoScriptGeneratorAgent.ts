import type { ILlmClient } from "../../LlmClient";
import type { DemoInput, DemoOutput } from "./shared";
import { getDefaultDemoLlm, runDemoAgentCore } from "./shared";

const AGENT_ID = "demo-script-generator";

export class DemoScriptGeneratorAgent {
  private static inst: DemoScriptGeneratorAgent | undefined;

  static get instance(): DemoScriptGeneratorAgent {
    if (!DemoScriptGeneratorAgent.inst) DemoScriptGeneratorAgent.inst = new DemoScriptGeneratorAgent();
    return DemoScriptGeneratorAgent.inst;
  }

  static reset(): void {
    DemoScriptGeneratorAgent.inst = undefined;
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
          "ROLE: Interactive demo scriptwriter top 1%; ritmo y clicks mínimos por insight.",
        mission:
          "Genera guión de demo interactiva por caso de uso: beat, copy en UI y transiciones.",
        fewShotExample:
          "Input: onboarding analytics. Output JSON: demoSteps 5 pantallas; ctaMessages micro-CTA.",
      },
      input,
      0.5,
    );
  }
}

export function getDemoScriptGeneratorAgent(): DemoScriptGeneratorAgent {
  return DemoScriptGeneratorAgent.instance;
}

export function resetDemoScriptGeneratorAgentForTests(): void {
  DemoScriptGeneratorAgent.reset();
}
