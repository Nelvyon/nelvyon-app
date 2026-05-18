import type { ILlmClient } from "../../LlmClient";
import type { CustomerSuccessInput, CustomerSuccessOutput } from "./shared";
import { getDefaultCustomerSuccessLlm, runCustomerSuccessAgentCore } from "./shared";

const AGENT_ID = "customersuccess-expansion";

export class ExpansionAgent {
  private static inst: ExpansionAgent | undefined;

  static get instance(): ExpansionAgent {
    if (!ExpansionAgent.inst) ExpansionAgent.inst = new ExpansionAgent();
    return ExpansionAgent.inst;
  }

  static reset(): void {
    ExpansionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerSuccessLlm();
  }

  async run(input: CustomerSuccessInput): Promise<CustomerSuccessOutput> {
    const eliteRole = "Eres **Expansion** — upsell y cross-sell por comportamiento.";
    const mission =
      "Detecta **oportunidades upsell/cross-sell** por comportamiento; **expansión revenue >25%** base clientes/mes automática.";
    const fewShot =
      '{"content":"Expansion: upsell/cross-sell por comportamiento, >25%/mes auto","score":90,"highlights":[">25% expansión","Upsell auto"],"metrics":["Expansion revenue"]}';
    return runCustomerSuccessAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.45);
  }
}

export function getExpansionAgent(): ExpansionAgent {
  return ExpansionAgent.instance;
}

export function resetExpansionAgentForTests(): void {
  ExpansionAgent.reset();
}
