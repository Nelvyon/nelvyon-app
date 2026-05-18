import type { ILlmClient } from "../../LlmClient";
import type { FormulariosEncuestasInput, FormulariosEncuestasOutput } from "./shared";
import { getDefaultFormulariosEncuestasLlm, runFormulariosEncuestasAgentCore } from "./shared";

const AGENT_ID = "formulariosencuestas-ai";

export class FormulariosEncuestasAIAgent {
  private static inst: FormulariosEncuestasAIAgent | undefined;

  static get instance(): FormulariosEncuestasAIAgent {
    if (!FormulariosEncuestasAIAgent.inst) FormulariosEncuestasAIAgent.inst = new FormulariosEncuestasAIAgent();
    return FormulariosEncuestasAIAgent.inst;
  }

  static reset(): void {
    FormulariosEncuestasAIAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFormulariosEncuestasLlm();
  }

  async run(input: FormulariosEncuestasInput): Promise<FormulariosEncuestasOutput> {
    const eliteRole = "Eres **FormulariosEncuestas AI** — formularios inteligentes adaptativos.";
    const mission =
      "Adapta **preguntas por respuesta**; analiza **sentimiento** en abiertas con accuracy **>90%**.";
    const fewShot =
      '{"content":"AI forms: preguntas adaptativas, sentimiento abiertas >90%","score":92,"highlights":["Adaptativo",">90% sentimiento"],"metrics":["Sentiment accuracy"]}';
    return runFormulariosEncuestasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getFormulariosEncuestasAIAgent(): FormulariosEncuestasAIAgent {
  return FormulariosEncuestasAIAgent.instance;
}

export function resetFormulariosEncuestasAIAgentForTests(): void {
  FormulariosEncuestasAIAgent.reset();
}
