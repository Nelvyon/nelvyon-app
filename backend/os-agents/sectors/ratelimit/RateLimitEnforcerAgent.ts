import type { ILlmClient } from "../../LlmClient";
import type { RateLimitInput, RateLimitOutput } from "./shared";
import { getDefaultRateLimitLlm, runRateLimitAgentCore } from "./shared";

const AGENT_ID = "ratelimit-enforcer";

export class RateLimitEnforcerAgent {
  private static inst: RateLimitEnforcerAgent | undefined;

  static get instance(): RateLimitEnforcerAgent {
    if (!RateLimitEnforcerAgent.inst) RateLimitEnforcerAgent.inst = new RateLimitEnforcerAgent();
    return RateLimitEnforcerAgent.inst;
  }

  static reset(): void {
    RateLimitEnforcerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRateLimitLlm();
  }

  async run(input: RateLimitInput): Promise<RateLimitOutput> {
    const eliteRole =
      "Eres **RateLimit Enforcement Engineer** — aplicación estricta de cuotas por plan con headers estándar.";
    const mission =
      "Aplica **límites por plan** (Starter 100/h, Pro 1000/h, Agency 10000/h) y caps diarios; emite **X-RateLimit-Limit**, **Remaining**, **Reset**.";
    const fewShot =
      '{"content":"Enforce plan caps + rate limit headers on 429","score":94,"highlights":["Starter 100/h","Headers"],"metrics":["Deny rate"]}';
    return runRateLimitAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getRateLimitEnforcerAgent(): RateLimitEnforcerAgent {
  return RateLimitEnforcerAgent.instance;
}

export function resetRateLimitEnforcerAgentForTests(): void {
  RateLimitEnforcerAgent.reset();
}
