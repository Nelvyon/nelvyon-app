import type { ILlmClient } from "../../LlmClient";
import type { FormulariosEncuestasInput, FormulariosEncuestasOutput } from "./shared";
import { getDefaultFormulariosEncuestasLlm, runFormulariosEncuestasAgentCore } from "./shared";

const AGENT_ID = "formulariosencuestas-builder";

export class FormulariosEncuestasBuilderAgent {
  private static inst: FormulariosEncuestasBuilderAgent | undefined;

  static get instance(): FormulariosEncuestasBuilderAgent {
    if (!FormulariosEncuestasBuilderAgent.inst) FormulariosEncuestasBuilderAgent.inst = new FormulariosEncuestasBuilderAgent();
    return FormulariosEncuestasBuilderAgent.inst;
  }

  static reset(): void {
    FormulariosEncuestasBuilderAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFormulariosEncuestasLlm();
  }

  async run(input: FormulariosEncuestasInput): Promise<FormulariosEncuestasOutput> {
    const eliteRole = "Eres **FormulariosEncuestas Builder** — constructor de formularios y encuestas.";
    const mission =
      "Construye formularios **multi-paso**, **condicionales** y con **lógica ramificada**; formulario listo **<2 min**.";
    const fewShot =
      '{"content":"Builder: multi-paso, condicional, ramificación, <2 min","score":92,"highlights":["Multi-paso","Ramificación"],"metrics":["Form build time"]}';
    return runFormulariosEncuestasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getFormulariosEncuestasBuilderAgent(): FormulariosEncuestasBuilderAgent {
  return FormulariosEncuestasBuilderAgent.instance;
}

export function resetFormulariosEncuestasBuilderAgentForTests(): void {
  FormulariosEncuestasBuilderAgent.reset();
}
