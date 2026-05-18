import type { ILlmClient } from "../../LlmClient";
import type { DemoInput, DemoOutput } from "./shared";
import { getDefaultDemoLlm, runDemoAgentCore } from "./shared";

const AGENT_ID = "demo-analytics-insight";

export class DemoAnalyticsInsightAgent {
  private static inst: DemoAnalyticsInsightAgent | undefined;

  static get instance(): DemoAnalyticsInsightAgent {
    if (!DemoAnalyticsInsightAgent.inst) DemoAnalyticsInsightAgent.inst = new DemoAnalyticsInsightAgent();
    return DemoAnalyticsInsightAgent.inst;
  }

  static reset(): void {
    DemoAnalyticsInsightAgent.inst = undefined;
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
          "ROLE: Product analytics interpreter top 1%; hipótesis accionables desde eventos demo.",
        mission:
          "Analiza comportamiento en demo (señales del brief) y sugiere optimizaciones de funnel y contenido.",
        fewShotExample:
          "Input: abandono paso 3. Output JSON: demoSteps reorder; ctaMessages test A/B.",
      },
      input,
      0.2,
    );
  }
}

export function getDemoAnalyticsInsightAgent(): DemoAnalyticsInsightAgent {
  return DemoAnalyticsInsightAgent.instance;
}

export function resetDemoAnalyticsInsightAgentForTests(): void {
  DemoAnalyticsInsightAgent.reset();
}
