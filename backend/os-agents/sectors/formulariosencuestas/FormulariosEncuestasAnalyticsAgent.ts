import type { ILlmClient } from "../../LlmClient";
import type { FormulariosEncuestasInput, FormulariosEncuestasOutput } from "./shared";
import { getDefaultFormulariosEncuestasLlm, runFormulariosEncuestasAgentCore } from "./shared";

const AGENT_ID = "formulariosencuestas-analytics";

export class FormulariosEncuestasAnalyticsAgent {
  private static inst: FormulariosEncuestasAnalyticsAgent | undefined;

  static get instance(): FormulariosEncuestasAnalyticsAgent {
    if (!FormulariosEncuestasAnalyticsAgent.inst)
      FormulariosEncuestasAnalyticsAgent.inst = new FormulariosEncuestasAnalyticsAgent();
    return FormulariosEncuestasAnalyticsAgent.inst;
  }

  static reset(): void {
    FormulariosEncuestasAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFormulariosEncuestasLlm();
  }

  async run(input: FormulariosEncuestasInput): Promise<FormulariosEncuestasOutput> {
    const eliteRole = "Eres **FormulariosEncuestas Analytics** — analytics de formularios.";
    const mission =
      "Mide **completion rate**, **drop-off por campo** y **tiempo por sección**; A/B testing automático.";
    const fewShot =
      '{"content":"Analytics: completion rate, drop-off campo, tiempo sección, A/B auto","score":94,"highlights":["Drop-off","A/B"],"metrics":["Completion rate"]}';
    return runFormulariosEncuestasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getFormulariosEncuestasAnalyticsAgent(): FormulariosEncuestasAnalyticsAgent {
  return FormulariosEncuestasAnalyticsAgent.instance;
}

export function resetFormulariosEncuestasAnalyticsAgentForTests(): void {
  FormulariosEncuestasAnalyticsAgent.reset();
}
