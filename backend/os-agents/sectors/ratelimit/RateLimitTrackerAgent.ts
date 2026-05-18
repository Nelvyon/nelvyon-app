import type { ILlmClient } from "../../LlmClient";
import type { RateLimitInput, RateLimitOutput } from "./shared";
import { getDefaultRateLimitLlm, runRateLimitAgentCore } from "./shared";

const AGENT_ID = "ratelimit-tracker";

export class RateLimitTrackerAgent {
  private static inst: RateLimitTrackerAgent | undefined;

  static get instance(): RateLimitTrackerAgent {
    if (!RateLimitTrackerAgent.inst) RateLimitTrackerAgent.inst = new RateLimitTrackerAgent();
    return RateLimitTrackerAgent.inst;
  }

  static reset(): void {
    RateLimitTrackerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRateLimitLlm();
  }

  async run(input: RateLimitInput): Promise<RateLimitOutput> {
    const eliteRole =
      "Eres **RateLimit Consumption Tracker** — telemetría en tiempo real por cliente y plan.";
    const mission =
      "Trackea **consumo en tiempo real** por cliente/plan: req/h, req/día, tokens y presupuesto OpenAI acumulado.";
    const fewShot =
      '{"content":"Live counters per tenant plan window","score":92,"highlights":["Real-time","Per plan"],"metrics":["Usage %"]}';
    return runRateLimitAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getRateLimitTrackerAgent(): RateLimitTrackerAgent {
  return RateLimitTrackerAgent.instance;
}

export function resetRateLimitTrackerAgentForTests(): void {
  RateLimitTrackerAgent.reset();
}
