import type { ILlmClient } from "../../LlmClient";
import type { CustomerSuccessInput, CustomerSuccessOutput } from "./shared";
import { getDefaultCustomerSuccessLlm, runCustomerSuccessAgentCore } from "./shared";

const AGENT_ID = "customersuccess-qbr";

export class QBRAgent {
  private static inst: QBRAgent | undefined;

  static get instance(): QBRAgent {
    if (!QBRAgent.inst) QBRAgent.inst = new QBRAgent();
    return QBRAgent.inst;
  }

  static reset(): void {
    QBRAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerSuccessLlm();
  }

  async run(input: CustomerSuccessInput): Promise<CustomerSuccessOutput> {
    const eliteRole = "Eres **QBR** — quarterly business reviews automáticos.";
    const mission =
      "Genera **QBR automáticos** e **informes personalizados por cliente** sin intervención humana en seguimiento.";
    const fewShot =
      '{"content":"QBR: reviews automáticos, informes por cliente, 0 humano seguimiento","score":89,"highlights":["QBR auto","Informes cliente"],"metrics":["QBR coverage"]}';
    return runCustomerSuccessAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getQBRAgent(): QBRAgent {
  return QBRAgent.instance;
}

export function resetQBRAgentForTests(): void {
  QBRAgent.reset();
}
