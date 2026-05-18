import type { ILlmClient } from "../../LlmClient";
import type { RateLimitInput, RateLimitOutput } from "./shared";
import { getDefaultRateLimitLlm, runRateLimitAgentCore } from "./shared";

const AGENT_ID = "ratelimit-throttle";

export class RateLimitThrottleAgent {
  private static inst: RateLimitThrottleAgent | undefined;

  static get instance(): RateLimitThrottleAgent {
    if (!RateLimitThrottleAgent.inst) RateLimitThrottleAgent.inst = new RateLimitThrottleAgent();
    return RateLimitThrottleAgent.inst;
  }

  static reset(): void {
    RateLimitThrottleAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRateLimitLlm();
  }

  async run(input: RateLimitInput): Promise<RateLimitOutput> {
    const eliteRole =
      "Eres **RateLimit Throttle Strategist** — colas y priorización bajo presión de cuota.";
    const mission =
      "Aplica **throttling inteligente**: prioriza agentes **críticos** sobre **secundarios**; colas, backoff y fairness entre tenants.";
    const fewShot =
      '{"content":"Priority queue critical agents over secondary under pressure","score":89,"highlights":["Critical first","Backoff"],"metrics":["Queue depth"]}';
    return runRateLimitAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getRateLimitThrottleAgent(): RateLimitThrottleAgent {
  return RateLimitThrottleAgent.instance;
}

export function resetRateLimitThrottleAgentForTests(): void {
  RateLimitThrottleAgent.reset();
}
