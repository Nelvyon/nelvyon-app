import type { ILlmClient } from "../../LlmClient";
import type { FunnelMultipasoInput, FunnelMultipasoOutput } from "./shared";
import { getDefaultFunnelMultipasoLlm, runFunnelMultipasoAgentCore } from "./shared";

const AGENT_ID = "funnelmultipaso-retargeting";

export class FunnelMultipasoRetargetingAgent {
  private static inst: FunnelMultipasoRetargetingAgent | undefined;

  static get instance(): FunnelMultipasoRetargetingAgent {
    if (!FunnelMultipasoRetargetingAgent.inst) FunnelMultipasoRetargetingAgent.inst = new FunnelMultipasoRetargetingAgent();
    return FunnelMultipasoRetargetingAgent.inst;
  }

  static reset(): void {
    FunnelMultipasoRetargetingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFunnelMultipasoLlm();
  }

  async run(input: FunnelMultipasoInput): Promise<FunnelMultipasoOutput> {
    const eliteRole = "Eres **FunnelMultipaso Retargeting** — retargeting inteligente por paso.";
    const mission =
      "Retargetea por **paso abandonado** con **audiencias dinámicas**; activación **<1h** tras abandono.";
    const fewShot =
      '{"content":"Retargeting: paso abandonado, audiencias dinámicas, <1h","score":93,"highlights":["<1h","Dinámico"],"metrics":["Retargeting latency"]}';
    return runFunnelMultipasoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getFunnelMultipasoRetargetingAgent(): FunnelMultipasoRetargetingAgent {
  return FunnelMultipasoRetargetingAgent.instance;
}

export function resetFunnelMultipasoRetargetingAgentForTests(): void {
  FunnelMultipasoRetargetingAgent.reset();
}
