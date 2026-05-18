import type { ILlmClient } from "../../LlmClient";
import type { DemoInput, DemoOutput } from "./shared";
import { getDefaultDemoLlm, runDemoAgentCore } from "./shared";

const AGENT_ID = "demo-sandbox-data";

export class DemoSandboxDataAgent {
  private static inst: DemoSandboxDataAgent | undefined;

  static get instance(): DemoSandboxDataAgent {
    if (!DemoSandboxDataAgent.inst) DemoSandboxDataAgent.inst = new DemoSandboxDataAgent();
    return DemoSandboxDataAgent.inst;
  }

  static reset(): void {
    DemoSandboxDataAgent.inst = undefined;
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
          "ROLE: Synthetic data designer top 1%; datasets demo realistas y GDPR-safe.",
        mission:
          "Genera datos de muestra realistas por sector: entidades, volúmenes y relaciones coherentes.",
        fewShotExample:
          "Input: retail. Output JSON: demoSteps seed tablas; ctaMessages reset sandbox.",
      },
      input,
      0.2,
    );
  }
}

export function getDemoSandboxDataAgent(): DemoSandboxDataAgent {
  return DemoSandboxDataAgent.instance;
}

export function resetDemoSandboxDataAgentForTests(): void {
  DemoSandboxDataAgent.reset();
}
