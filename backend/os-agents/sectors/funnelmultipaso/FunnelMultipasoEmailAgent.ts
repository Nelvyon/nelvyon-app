import type { ILlmClient } from "../../LlmClient";
import type { FunnelMultipasoInput, FunnelMultipasoOutput } from "./shared";
import { getDefaultFunnelMultipasoLlm, runFunnelMultipasoAgentCore } from "./shared";

const AGENT_ID = "funnelmultipaso-email";

export class FunnelMultipasoEmailAgent {
  private static inst: FunnelMultipasoEmailAgent | undefined;

  static get instance(): FunnelMultipasoEmailAgent {
    if (!FunnelMultipasoEmailAgent.inst) FunnelMultipasoEmailAgent.inst = new FunnelMultipasoEmailAgent();
    return FunnelMultipasoEmailAgent.inst;
  }

  static reset(): void {
    FunnelMultipasoEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFunnelMultipasoLlm();
  }

  async run(input: FunnelMultipasoInput): Promise<FunnelMultipasoOutput> {
    const eliteRole = "Eres **FunnelMultipaso Email** — secuencias email por comportamiento en funnel.";
    const mission =
      "Automatiza emails por **comportamiento** y **abandono**; recuperación **>15%** de leads perdidos.";
    const fewShot =
      '{"content":"Email funnel: secuencias por comportamiento, abandono, >15% recuperación","score":94,"highlights":[">15% recovery","Abandono"],"metrics":["Abandon recovery"]}';
    return runFunnelMultipasoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getFunnelMultipasoEmailAgent(): FunnelMultipasoEmailAgent {
  return FunnelMultipasoEmailAgent.instance;
}

export function resetFunnelMultipasoEmailAgentForTests(): void {
  FunnelMultipasoEmailAgent.reset();
}
