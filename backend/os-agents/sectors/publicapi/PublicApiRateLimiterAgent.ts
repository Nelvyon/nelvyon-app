import type { ILlmClient } from "../../LlmClient";
import type { PublicApiInput, PublicApiOutput } from "./shared";
import { getDefaultPublicApiLlm, runPublicApiAgentCore } from "./shared";

const AGENT_ID = "publicapi-rate-limiter";

export class PublicApiRateLimiterAgent {
  private static inst: PublicApiRateLimiterAgent | undefined;

  static get instance(): PublicApiRateLimiterAgent {
    if (!PublicApiRateLimiterAgent.inst) PublicApiRateLimiterAgent.inst = new PublicApiRateLimiterAgent();
    return PublicApiRateLimiterAgent.inst;
  }

  static reset(): void {
    PublicApiRateLimiterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPublicApiLlm();
  }

  async run(input: PublicApiInput): Promise<PublicApiOutput> {
    return runPublicApiAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Token bucket por plan; cabeceras estándar.",
        mission:
          "Rate limiting por plan: Starter **100 req/h**, Pro **1000**, Agency **10000**; cabeceras **X-RateLimit-Limit**, **X-RateLimit-Remaining**, **X-RateLimit-Reset**.",
        fewShotExample:
          '{"content":"Pro → 1000/h ventana; remaining decrece.","score":94,"highlights":["Plan Pro","Headers"],"metrics":["429 si excede"]}',
      },
      input,
      0.1,
    );
  }
}

export function getPublicApiRateLimiterAgent(): PublicApiRateLimiterAgent {
  return PublicApiRateLimiterAgent.instance;
}

export function resetPublicApiRateLimiterAgentForTests(): void {
  PublicApiRateLimiterAgent.reset();
}
