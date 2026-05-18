import type { ILlmClient } from "../../LlmClient";
import type { CustomerSuccessInput, CustomerSuccessOutput } from "./shared";
import { getDefaultCustomerSuccessLlm, runCustomerSuccessAgentCore } from "./shared";

const AGENT_ID = "customersuccess-escalation";

export class EscalationAgent {
  private static inst: EscalationAgent | undefined;

  static get instance(): EscalationAgent {
    if (!EscalationAgent.inst) EscalationAgent.inst = new EscalationAgent();
    return EscalationAgent.inst;
  }

  static reset(): void {
    EscalationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerSuccessLlm();
  }

  async run(input: CustomerSuccessInput): Promise<CustomerSuccessOutput> {
    const eliteRole = "Eres **Escalation** — escalaciones críticas proactivas.";
    const mission =
      "Detecta y gestiona **escalaciones críticas** con **alertas proactivas** alineadas a health score en tiempo real.";
    const fewShot =
      '{"content":"Escalation: críticas, alertas proactivas, health RT","score":91,"highlights":["Alertas proactivas","Críticas RT"],"metrics":["Escalation detection"]}';
    return runCustomerSuccessAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getEscalationAgent(): EscalationAgent {
  return EscalationAgent.instance;
}

export function resetEscalationAgentForTests(): void {
  EscalationAgent.reset();
}
