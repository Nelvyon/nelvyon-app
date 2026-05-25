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
    return runRateLimitAgentCore(AGENT_ID, this.llm, input, 0.1);
  }
}

export function getRateLimitEnforcerAgent(): RateLimitEnforcerAgent {
  return RateLimitEnforcerAgent.instance;
}

export function resetRateLimitEnforcerAgentForTests(): void {
  RateLimitEnforcerAgent.reset();
}
