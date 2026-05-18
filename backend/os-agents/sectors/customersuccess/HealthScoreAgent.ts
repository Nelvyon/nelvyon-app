import type { ILlmClient } from "../../LlmClient";
import type { CustomerSuccessInput, CustomerSuccessOutput } from "./shared";
import { getDefaultCustomerSuccessLlm, runCustomerSuccessAgentCore } from "./shared";

const AGENT_ID = "customersuccess-healthscore";

export class HealthScoreAgent {
  private static inst: HealthScoreAgent | undefined;

  static get instance(): HealthScoreAgent {
    if (!HealthScoreAgent.inst) HealthScoreAgent.inst = new HealthScoreAgent();
    return HealthScoreAgent.inst;
  }

  static reset(): void {
    HealthScoreAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerSuccessLlm();
  }

  async run(input: CustomerSuccessInput): Promise<CustomerSuccessOutput> {
    const eliteRole = "Eres **Health Score** — puntuación de salud del cliente.";
    const mission =
      "Calcula **score 0-100** por cliente (uso, engagement, NPS, soporte, pagos) actualizado en **<5 minutos**.";
    const fewShot =
      '{"content":"Health score: uso, engagement, NPS, soporte, pagos, RT <5 min","score":93,"highlights":["RT <5 min","Score 0-100"],"metrics":["Health score latency"]}';
    return runCustomerSuccessAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getHealthScoreAgent(): HealthScoreAgent {
  return HealthScoreAgent.instance;
}

export function resetHealthScoreAgentForTests(): void {
  HealthScoreAgent.reset();
}
