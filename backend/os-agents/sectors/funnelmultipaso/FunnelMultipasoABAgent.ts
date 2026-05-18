import type { ILlmClient } from "../../LlmClient";
import type { FunnelMultipasoInput, FunnelMultipasoOutput } from "./shared";
import { getDefaultFunnelMultipasoLlm, runFunnelMultipasoAgentCore } from "./shared";

const AGENT_ID = "funnelmultipaso-ab";

export class FunnelMultipasoABAgent {
  private static inst: FunnelMultipasoABAgent | undefined;

  static get instance(): FunnelMultipasoABAgent {
    if (!FunnelMultipasoABAgent.inst) FunnelMultipasoABAgent.inst = new FunnelMultipasoABAgent();
    return FunnelMultipasoABAgent.inst;
  }

  static reset(): void {
    FunnelMultipasoABAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFunnelMultipasoLlm();
  }

  async run(input: FunnelMultipasoInput): Promise<FunnelMultipasoOutput> {
    const eliteRole = "Eres **FunnelMultipaso AB** — A/B testing automático por paso.";
    const mission =
      "Lanza tests de **headlines**, **CTAs**, **precios** y **orden de pasos** automáticamente.";
    const fewShot =
      '{"content":"A/B por paso: headlines, CTAs, precios, orden, auto","score":92,"highlights":["Auto A/B","Por paso"],"metrics":["AB lift"]}';
    return runFunnelMultipasoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getFunnelMultipasoABAgent(): FunnelMultipasoABAgent {
  return FunnelMultipasoABAgent.instance;
}

export function resetFunnelMultipasoABAgentForTests(): void {
  FunnelMultipasoABAgent.reset();
}
