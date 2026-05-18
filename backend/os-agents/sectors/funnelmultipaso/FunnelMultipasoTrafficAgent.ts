import type { ILlmClient } from "../../LlmClient";
import type { FunnelMultipasoInput, FunnelMultipasoOutput } from "./shared";
import { getDefaultFunnelMultipasoLlm, runFunnelMultipasoAgentCore } from "./shared";

const AGENT_ID = "funnelmultipaso-traffic";

export class FunnelMultipasoTrafficAgent {
  private static inst: FunnelMultipasoTrafficAgent | undefined;

  static get instance(): FunnelMultipasoTrafficAgent {
    if (!FunnelMultipasoTrafficAgent.inst) FunnelMultipasoTrafficAgent.inst = new FunnelMultipasoTrafficAgent();
    return FunnelMultipasoTrafficAgent.inst;
  }

  static reset(): void {
    FunnelMultipasoTrafficAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFunnelMultipasoLlm();
  }

  async run(input: FunnelMultipasoInput): Promise<FunnelMultipasoOutput> {
    const eliteRole = "Eres **FunnelMultipaso Traffic** — estrategia de tráfico por funnel.";
    const mission =
      "Planifica tráfico **paid**, **orgánico**, **email** y **retargeting** por paso del funnel.";
    const fewShot =
      '{"content":"Traffic: paid, orgánico, email, retargeting por paso","score":91,"highlights":["Por paso","Retargeting"],"metrics":["Traffic mix"]}';
    return runFunnelMultipasoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getFunnelMultipasoTrafficAgent(): FunnelMultipasoTrafficAgent {
  return FunnelMultipasoTrafficAgent.instance;
}

export function resetFunnelMultipasoTrafficAgentForTests(): void {
  FunnelMultipasoTrafficAgent.reset();
}
