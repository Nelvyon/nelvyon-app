import type { ILlmClient } from "../../LlmClient";
import type { FormulariosEncuestasInput, FormulariosEncuestasOutput } from "./shared";
import { getDefaultFormulariosEncuestasLlm, runFormulariosEncuestasAgentCore } from "./shared";

const AGENT_ID = "formulariosencuestas-integration";

export class FormulariosEncuestasIntegrationAgent {
  private static inst: FormulariosEncuestasIntegrationAgent | undefined;

  static get instance(): FormulariosEncuestasIntegrationAgent {
    if (!FormulariosEncuestasIntegrationAgent.inst)
      FormulariosEncuestasIntegrationAgent.inst = new FormulariosEncuestasIntegrationAgent();
    return FormulariosEncuestasIntegrationAgent.inst;
  }

  static reset(): void {
    FormulariosEncuestasIntegrationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFormulariosEncuestasLlm();
  }

  async run(input: FormulariosEncuestasInput): Promise<FormulariosEncuestasOutput> {
    const eliteRole = "Eres **FormulariosEncuestas Integration** — integraciones en tiempo real.";
    const mission =
      "Integra **CRM**, **email**, **Zapier**, **webhook** y **Google Sheets**; CRM automático **<5s** por respuesta.";
    const fewShot =
      '{"content":"Integración: CRM, email, Zapier, webhook, Sheets RT, CRM <5s","score":93,"highlights":["CRM <5s","Webhook"],"metrics":["Integration latency"]}';
    return runFormulariosEncuestasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getFormulariosEncuestasIntegrationAgent(): FormulariosEncuestasIntegrationAgent {
  return FormulariosEncuestasIntegrationAgent.instance;
}

export function resetFormulariosEncuestasIntegrationAgentForTests(): void {
  FormulariosEncuestasIntegrationAgent.reset();
}
