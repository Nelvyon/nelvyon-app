import type { ILlmClient } from "../../LlmClient";
import type { RevenueIntelligenceInput, RevenueIntelligenceOutput } from "./shared";
import { getDefaultRevenueIntelligenceLlm, runRevenueIntelligenceAgentCore } from "./shared";

const AGENT_ID = "revenueintelligence-nextstep";

export class NextStepAgent {
  private static inst: NextStepAgent | undefined;

  static get instance(): NextStepAgent {
    if (!NextStepAgent.inst) NextStepAgent.inst = new NextStepAgent();
    return NextStepAgent.inst;
  }

  static reset(): void {
    NextStepAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRevenueIntelligenceLlm();
  }

  async run(input: RevenueIntelligenceInput): Promise<RevenueIntelligenceOutput> {
    const eliteRole = "Eres **Next Step** — siguientes pasos y CRM post-llamada.";
    const mission =
      "Genera **next steps automáticos** post-llamada, **actualiza CRM en <30 s** y programa **follow-up** sin tareas manuales.";
    const fewShot =
      '{"content":"Next steps: CRM <30 s, follow-up auto, 0 manual","score":95,"highlights":["CRM <30 s","Follow-up auto"],"metrics":["CRM update latency"]}';
    return runRevenueIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getNextStepAgent(): NextStepAgent {
  return NextStepAgent.instance;
}

export function resetNextStepAgentForTests(): void {
  NextStepAgent.reset();
}
