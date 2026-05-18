import type { ILlmClient } from "../../LlmClient";
import type { FormulariosEncuestasInput, FormulariosEncuestasOutput } from "./shared";
import { getDefaultFormulariosEncuestasLlm, runFormulariosEncuestasAgentCore } from "./shared";

const AGENT_ID = "formulariosencuestas-report";

export class FormulariosEncuestasReportAgent {
  private static inst: FormulariosEncuestasReportAgent | undefined;

  static get instance(): FormulariosEncuestasReportAgent {
    if (!FormulariosEncuestasReportAgent.inst) FormulariosEncuestasReportAgent.inst = new FormulariosEncuestasReportAgent();
    return FormulariosEncuestasReportAgent.inst;
  }

  static reset(): void {
    FormulariosEncuestasReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFormulariosEncuestasLlm();
  }

  async run(input: FormulariosEncuestasInput): Promise<FormulariosEncuestasOutput> {
    const eliteRole = "Eres **FormulariosEncuestas Report** — informes de respuestas.";
    const mission =
      "Genera informes con **tendencias**, **segmentos** e **insights accionables** automáticos.";
    const fewShot =
      '{"content":"Informe respuestas: tendencias, segmentos, insights accionables","score":91,"highlights":["Tendencias","Insights"],"metrics":["Actionable insights"]}';
    return runFormulariosEncuestasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getFormulariosEncuestasReportAgent(): FormulariosEncuestasReportAgent {
  return FormulariosEncuestasReportAgent.instance;
}

export function resetFormulariosEncuestasReportAgentForTests(): void {
  FormulariosEncuestasReportAgent.reset();
}
