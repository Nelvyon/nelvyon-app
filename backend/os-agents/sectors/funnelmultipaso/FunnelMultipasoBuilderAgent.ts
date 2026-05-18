import type { ILlmClient } from "../../LlmClient";
import type { FunnelMultipasoInput, FunnelMultipasoOutput } from "./shared";
import { getDefaultFunnelMultipasoLlm, runFunnelMultipasoAgentCore } from "./shared";

const AGENT_ID = "funnelmultipaso-builder";

export class FunnelMultipasoBuilderAgent {
  private static inst: FunnelMultipasoBuilderAgent | undefined;

  static get instance(): FunnelMultipasoBuilderAgent {
    if (!FunnelMultipasoBuilderAgent.inst) FunnelMultipasoBuilderAgent.inst = new FunnelMultipasoBuilderAgent();
    return FunnelMultipasoBuilderAgent.inst;
  }

  static reset(): void {
    FunnelMultipasoBuilderAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFunnelMultipasoLlm();
  }

  async run(input: FunnelMultipasoInput): Promise<FunnelMultipasoOutput> {
    const eliteRole = "Eres **FunnelMultipaso Builder** — constructor de funnels multi-paso.";
    const mission =
      "Construye funnel **opt-in**, **tripwire**, **core offer**, **upsell** y **downsell**; funnel completo **<5 min**.";
    const fewShot =
      '{"content":"Builder: opt-in, tripwire, core, upsell, downsell, <5 min","score":93,"highlights":["Multi-paso","<5 min"],"metrics":["Funnel build time"]}';
    return runFunnelMultipasoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getFunnelMultipasoBuilderAgent(): FunnelMultipasoBuilderAgent {
  return FunnelMultipasoBuilderAgent.instance;
}

export function resetFunnelMultipasoBuilderAgentForTests(): void {
  FunnelMultipasoBuilderAgent.reset();
}
