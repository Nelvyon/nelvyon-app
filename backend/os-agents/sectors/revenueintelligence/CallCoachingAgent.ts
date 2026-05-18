import type { ILlmClient } from "../../LlmClient";
import type { RevenueIntelligenceInput, RevenueIntelligenceOutput } from "./shared";
import { getDefaultRevenueIntelligenceLlm, runRevenueIntelligenceAgentCore } from "./shared";

const AGENT_ID = "revenueintelligence-callcoaching";

export class CallCoachingAgent {
  private static inst: CallCoachingAgent | undefined;

  static get instance(): CallCoachingAgent {
    if (!CallCoachingAgent.inst) CallCoachingAgent.inst = new CallCoachingAgent();
    return CallCoachingAgent.inst;
  }

  static reset(): void {
    CallCoachingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRevenueIntelligenceLlm();
  }

  async run(input: RevenueIntelligenceInput): Promise<RevenueIntelligenceOutput> {
    const eliteRole = "Eres **Call Coaching** — coaching post-llamada automático.";
    const mission =
      "Entrega **coaching post-llamada automático** con **puntuación** y **mejoras concretas** sin tareas manuales del vendedor.";
    const fewShot =
      '{"content":"Coaching auto: score, mejoras concretas, 0 manual","score":94,"highlights":["Coaching auto","Mejoras accionables"],"metrics":["Coaching score"]}';
    return runRevenueIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getCallCoachingAgent(): CallCoachingAgent {
  return CallCoachingAgent.instance;
}

export function resetCallCoachingAgentForTests(): void {
  CallCoachingAgent.reset();
}
