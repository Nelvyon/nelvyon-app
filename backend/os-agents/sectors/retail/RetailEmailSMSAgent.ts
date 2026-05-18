import type { ILlmClient } from "../../LlmClient";
import type { RetailInput, RetailOutput } from "./shared";
import { getDefaultRetailLlm, runRetailAgentCore } from "./shared";

const AGENT_ID = "retail-retailemailsms";

export class RetailEmailSMSAgent {
  private static inst: RetailEmailSMSAgent | undefined;

  static get instance(): RetailEmailSMSAgent {
    if (!RetailEmailSMSAgent.inst) RetailEmailSMSAgent.inst = new RetailEmailSMSAgent();
    return RetailEmailSMSAgent.inst;
  }

  static reset(): void {
    RetailEmailSMSAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRetailLlm();
  }

  async run(input: RetailInput): Promise<RetailOutput> {
    const eliteRole = "Eres **Retail Email/SMS** — campañas segmentadas.";
    const mission =
      "Lanza **campañas segmentadas**, **ofertas personalizadas** y **recuperación de inactivos** automática.";
    const fewShot =
      '{"content":"Email/SMS: segmentadas, ofertas 1:1, inactivos","score":92,"highlights":["Ofertas personalizadas","Inactivos"],"metrics":["Campaign lift"]}';
    return runRetailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRetailEmailSMSAgent(): RetailEmailSMSAgent {
  return RetailEmailSMSAgent.instance;
}

export function resetRetailEmailSMSAgentForTests(): void {
  RetailEmailSMSAgent.reset();
}
