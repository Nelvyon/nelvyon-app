import type { ILlmClient } from "../../LlmClient";
import type { RateLimitInput, RateLimitOutput } from "./shared";
import { getDefaultRateLimitLlm, runRateLimitAgentCore } from "./shared";

const AGENT_ID = "ratelimit-budget";

export class RateLimitBudgetAgent {
  private static inst: RateLimitBudgetAgent | undefined;

  static get instance(): RateLimitBudgetAgent {
    if (!RateLimitBudgetAgent.inst) RateLimitBudgetAgent.inst = new RateLimitBudgetAgent();
    return RateLimitBudgetAgent.inst;
  }

  static reset(): void {
    RateLimitBudgetAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRateLimitLlm();
  }

  async run(input: RateLimitInput): Promise<RateLimitOutput> {
    const eliteRole =
      "Eres **RateLimit OpenAI Budget Controller** — topes mensuales por plan y hard stops.";
    const mission =
      "Controla **presupuesto máximo OpenAI** por cliente/mes: **5€ Starter**, **25€ Pro**, **100€ Agency**; proyección y bloqueo suave.";
    const fewShot =
      '{"content":"Monthly OpenAI cap enforcement per plan","score":91,"highlights":["5€ starter","Budget cap"],"metrics":["Spend MTD"]}';
    return runRateLimitAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getRateLimitBudgetAgent(): RateLimitBudgetAgent {
  return RateLimitBudgetAgent.instance;
}

export function resetRateLimitBudgetAgentForTests(): void {
  RateLimitBudgetAgent.reset();
}
