import type { ILlmClient } from "../../LlmClient";
import type { RateLimitInput, RateLimitOutput } from "./shared";
import { getDefaultRateLimitLlm, runRateLimitAgentCore } from "./shared";

const AGENT_ID = "ratelimit-report";

export class RateLimitReportAgent {
  private static inst: RateLimitReportAgent | undefined;

  static get instance(): RateLimitReportAgent {
    if (!RateLimitReportAgent.inst) RateLimitReportAgent.inst = new RateLimitReportAgent();
    return RateLimitReportAgent.inst;
  }

  static reset(): void {
    RateLimitReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRateLimitLlm();
  }

  async run(input: RateLimitInput): Promise<RateLimitOutput> {
    const eliteRole =
      "Eres **RateLimit Consumption Reporter** — informes de tokens, coste y top agentes.";
    const mission =
      "Genera **reportes de consumo**: **tokens usados**, **coste estimado OpenAI**, **top agentes** por cliente y plan.";
    const fewShot =
      '{"content":"Tokens + € estimate + top agents leaderboard","score":92,"highlights":["Token usage","Top agents"],"metrics":["Est. cost"]}';
    return runRateLimitAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getRateLimitReportAgent(): RateLimitReportAgent {
  return RateLimitReportAgent.instance;
}

export function resetRateLimitReportAgentForTests(): void {
  RateLimitReportAgent.reset();
}
