import type { ILlmClient } from "../../LlmClient";
import type { DemoInput, DemoOutput } from "./shared";
import { getDefaultDemoLlm, runDemoAgentCore } from "./shared";

const AGENT_ID = "demo-follow-up-sequence";

export class DemoFollowUpSequenceAgent {
  private static inst: DemoFollowUpSequenceAgent | undefined;

  static get instance(): DemoFollowUpSequenceAgent {
    if (!DemoFollowUpSequenceAgent.inst) DemoFollowUpSequenceAgent.inst = new DemoFollowUpSequenceAgent();
    return DemoFollowUpSequenceAgent.inst;
  }

  static reset(): void {
    DemoFollowUpSequenceAgent.inst = undefined;
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
          "ROLE: Lifecycle strategist top 1%; seguimiento post-demo sin ser invasivo.",
        mission:
          "Genera secuencia de seguimiento post-demo personalizada: email/in-app y recordatorios.",
        fewShotExample:
          "Input: visitante anónimo con email capturado opcional. Output JSON: demoSteps resumen; ctaMessages D+1 D+3.",
      },
      input,
      0.5,
    );
  }
}

export function getDemoFollowUpSequenceAgent(): DemoFollowUpSequenceAgent {
  return DemoFollowUpSequenceAgent.instance;
}

export function resetDemoFollowUpSequenceAgentForTests(): void {
  DemoFollowUpSequenceAgent.reset();
}
