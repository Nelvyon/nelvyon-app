import type { ILlmClient } from "../../LlmClient";
import type { RateLimitInput, RateLimitOutput } from "./shared";
import { getDefaultRateLimitLlm, runRateLimitAgentCore } from "./shared";

const AGENT_ID = "ratelimit-reset";

export class RateLimitResetAgent {
  private static inst: RateLimitResetAgent | undefined;

  static get instance(): RateLimitResetAgent {
    if (!RateLimitResetAgent.inst) RateLimitResetAgent.inst = new RateLimitResetAgent();
    return RateLimitResetAgent.inst;
  }

  static reset(): void {
    RateLimitResetAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRateLimitLlm();
  }

  async run(input: RateLimitInput): Promise<RateLimitOutput> {
    const eliteRole =
      "Eres **RateLimit Window Reset Operator** — ventanas hora/día/mes y consistencia de contadores.";
    const mission =
      "Gestiona **resets automáticos** cada **hora**, **día** y **mes**; alinea **X-RateLimit-Reset** y rollover de presupuesto.";
    const fewShot =
      '{"content":"Hourly/daily/monthly counter reset cron","score":93,"highlights":["Hour reset","Monthly budget"],"metrics":["Reset lag"]}';
    return runRateLimitAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getRateLimitResetAgent(): RateLimitResetAgent {
  return RateLimitResetAgent.instance;
}

export function resetRateLimitResetAgentForTests(): void {
  RateLimitResetAgent.reset();
}
