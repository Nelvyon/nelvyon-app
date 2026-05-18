import type { ILlmClient } from "../../LlmClient";
import type { RateLimitInput, RateLimitOutput } from "./shared";
import { getDefaultRateLimitLlm, runRateLimitAgentCore } from "./shared";

const AGENT_ID = "ratelimit-upgrade";

export class RateLimitUpgradeAgent {
  private static inst: RateLimitUpgradeAgent | undefined;

  static get instance(): RateLimitUpgradeAgent {
    if (!RateLimitUpgradeAgent.inst) RateLimitUpgradeAgent.inst = new RateLimitUpgradeAgent();
    return RateLimitUpgradeAgent.inst;
  }

  static reset(): void {
    RateLimitUpgradeAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRateLimitLlm();
  }

  async run(input: RateLimitInput): Promise<RateLimitOutput> {
    const eliteRole =
      "Eres **RateLimit Upgrade Advisor** — detección de overage y ofertas de plan.";
    const mission =
      "Detecta clientes que **superan límites 3 días seguidos** y dispara **email automático** con **oferta de upgrade** (Starter→Pro→Agency).";
    const fewShot =
      '{"content":"3-day overage streak → upgrade email offer","score":90,"highlights":["3-day streak","Upgrade email"],"metrics":["Upgrade CTR"]}';
    return runRateLimitAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getRateLimitUpgradeAgent(): RateLimitUpgradeAgent {
  return RateLimitUpgradeAgent.instance;
}

export function resetRateLimitUpgradeAgentForTests(): void {
  RateLimitUpgradeAgent.reset();
}
