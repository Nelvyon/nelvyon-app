import type { ILlmClient } from "../../LlmClient";
import type { DemoInput, DemoOutput } from "./shared";
import { getDefaultDemoLlm, runDemoAgentCore } from "./shared";

const AGENT_ID = "demo-conversion-nudge";

export class DemoConversionNudgeAgent {
  private static inst: DemoConversionNudgeAgent | undefined;

  static get instance(): DemoConversionNudgeAgent {
    if (!DemoConversionNudgeAgent.inst) DemoConversionNudgeAgent.inst = new DemoConversionNudgeAgent();
    return DemoConversionNudgeAgent.inst;
  }

  static reset(): void {
    DemoConversionNudgeAgent.inst = undefined;
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
          "ROLE: PLG conversion copy chief top 1%; nudges contextuales sin dark patterns.",
        mission:
          "Crea mensajes de conversión contextuales en cada paso de la demo: timing y variantes A/B.",
        fewShotExample:
          "Input: post-valor mostrado. Output JSON: demoSteps con puntos de CTA; ctaMessages suaves.",
      },
      input,
      0.5,
    );
  }
}

export function getDemoConversionNudgeAgent(): DemoConversionNudgeAgent {
  return DemoConversionNudgeAgent.instance;
}

export function resetDemoConversionNudgeAgentForTests(): void {
  DemoConversionNudgeAgent.reset();
}
