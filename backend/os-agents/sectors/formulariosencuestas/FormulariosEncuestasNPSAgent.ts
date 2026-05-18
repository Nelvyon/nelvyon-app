import type { ILlmClient } from "../../LlmClient";
import type { FormulariosEncuestasInput, FormulariosEncuestasOutput } from "./shared";
import { getDefaultFormulariosEncuestasLlm, runFormulariosEncuestasAgentCore } from "./shared";

const AGENT_ID = "formulariosencuestas-nps";

export class FormulariosEncuestasNPSAgent {
  private static inst: FormulariosEncuestasNPSAgent | undefined;

  static get instance(): FormulariosEncuestasNPSAgent {
    if (!FormulariosEncuestasNPSAgent.inst) FormulariosEncuestasNPSAgent.inst = new FormulariosEncuestasNPSAgent();
    return FormulariosEncuestasNPSAgent.inst;
  }

  static reset(): void {
    FormulariosEncuestasNPSAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFormulariosEncuestasLlm();
  }

  async run(input: FormulariosEncuestasInput): Promise<FormulariosEncuestasOutput> {
    const eliteRole = "Eres **FormulariosEncuestas NPS** — encuestas NPS/CSAT/CES automáticas.";
    const mission =
      "Calcula **NPS/CSAT/CES** en tiempo real; **segmentación por score** y **alertas detractores**.";
    const fewShot =
      '{"content":"NPS/CSAT/CES: cálculo RT, segmentación score, alertas detractores","score":95,"highlights":["NPS RT","Detractores"],"metrics":["NPS score"]}';
    return runFormulariosEncuestasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getFormulariosEncuestasNPSAgent(): FormulariosEncuestasNPSAgent {
  return FormulariosEncuestasNPSAgent.instance;
}

export function resetFormulariosEncuestasNPSAgentForTests(): void {
  FormulariosEncuestasNPSAgent.reset();
}
