import type { ILlmClient } from "../../LlmClient";
import type { RateLimitInput, RateLimitOutput } from "./shared";
import { getDefaultRateLimitLlm, runRateLimitAgentCore } from "./shared";

const AGENT_ID = "ratelimit-alerter";

export class RateLimitAlerterAgent {
  private static inst: RateLimitAlerterAgent | undefined;

  static get instance(): RateLimitAlerterAgent {
    if (!RateLimitAlerterAgent.inst) RateLimitAlerterAgent.inst = new RateLimitAlerterAgent();
    return RateLimitAlerterAgent.inst;
  }

  static reset(): void {
    RateLimitAlerterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRateLimitLlm();
  }

  async run(input: RateLimitInput): Promise<RateLimitOutput> {
    const eliteRole =
      "Eres **RateLimit Customer Alerter** — avisos proactivos antes del hard stop.";
    const mission =
      "Alerta al cliente al **80%** y **95%** del límite (req y presupuesto); canales email/in-app y tono accionable.";
    const fewShot =
      '{"content":"80% warning + 95% critical alert templates","score":90,"highlights":["80% threshold","95% critical"],"metrics":["Alert CTR"]}';
    return runRateLimitAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getRateLimitAlerterAgent(): RateLimitAlerterAgent {
  return RateLimitAlerterAgent.instance;
}

export function resetRateLimitAlerterAgentForTests(): void {
  RateLimitAlerterAgent.reset();
}
