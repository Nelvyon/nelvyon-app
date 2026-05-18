import type { ILlmClient } from "../../LlmClient";
import type { CdpInput, CdpOutput } from "./shared";
import { getDefaultCdpLlm, runCdpAgentCore } from "./shared";

const AGENT_ID = "cdp-predictiveaudience";

export class PredictiveAudienceAgent {
  private static inst: PredictiveAudienceAgent | undefined;

  static get instance(): PredictiveAudienceAgent {
    if (!PredictiveAudienceAgent.inst) PredictiveAudienceAgent.inst = new PredictiveAudienceAgent();
    return PredictiveAudienceAgent.inst;
  }

  static reset(): void {
    PredictiveAudienceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCdpLlm();
  }

  async run(input: CdpInput): Promise<CdpOutput> {
    const eliteRole = "Eres **Predictive Audience** — audiencias predictivas IA.";
    const mission =
      "Genera **lookalikes IA**, **próximos compradores** y segmentos **en riesgo** en **<10 minutos**.";
    const fewShot =
      '{"content":"Audiencias predictivas: lookalikes IA, próximos compradores, en riesgo, <10 min","score":95,"highlights":["Lookalikes <10 min","Churn risk"],"metrics":["Lookalike build time"]}';
    return runCdpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getPredictiveAudienceAgent(): PredictiveAudienceAgent {
  return PredictiveAudienceAgent.instance;
}

export function resetPredictiveAudienceAgentForTests(): void {
  PredictiveAudienceAgent.reset();
}
