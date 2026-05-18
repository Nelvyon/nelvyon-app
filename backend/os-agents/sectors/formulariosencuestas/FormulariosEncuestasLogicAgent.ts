import type { ILlmClient } from "../../LlmClient";
import type { FormulariosEncuestasInput, FormulariosEncuestasOutput } from "./shared";
import { getDefaultFormulariosEncuestasLlm, runFormulariosEncuestasAgentCore } from "./shared";

const AGENT_ID = "formulariosencuestas-logic";

export class FormulariosEncuestasLogicAgent {
  private static inst: FormulariosEncuestasLogicAgent | undefined;

  static get instance(): FormulariosEncuestasLogicAgent {
    if (!FormulariosEncuestasLogicAgent.inst) FormulariosEncuestasLogicAgent.inst = new FormulariosEncuestasLogicAgent();
    return FormulariosEncuestasLogicAgent.inst;
  }

  static reset(): void {
    FormulariosEncuestasLogicAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFormulariosEncuestasLlm();
  }

  async run(input: FormulariosEncuestasInput): Promise<FormulariosEncuestasOutput> {
    const eliteRole = "Eres **FormulariosEncuestas Logic** — lógica condicional avanzada.";
    const mission =
      "Configura **mostrar/ocultar campos**, **saltos de sección** y **cálculos automáticos** por respuesta.";
    const fewShot =
      '{"content":"Logic: show/hide, saltos sección, cálculos automáticos","score":93,"highlights":["Condicional","Saltos"],"metrics":["Logic coverage"]}';
    return runFormulariosEncuestasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getFormulariosEncuestasLogicAgent(): FormulariosEncuestasLogicAgent {
  return FormulariosEncuestasLogicAgent.instance;
}

export function resetFormulariosEncuestasLogicAgentForTests(): void {
  FormulariosEncuestasLogicAgent.reset();
}
