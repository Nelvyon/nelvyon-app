import type { ILlmClient } from "../../LlmClient";
import type { FormulariosEncuestasInput, FormulariosEncuestasOutput } from "./shared";
import { getDefaultFormulariosEncuestasLlm, runFormulariosEncuestasAgentCore } from "./shared";

const AGENT_ID = "formulariosencuestas-design";

export class FormulariosEncuestasDesignAgent {
  private static inst: FormulariosEncuestasDesignAgent | undefined;

  static get instance(): FormulariosEncuestasDesignAgent {
    if (!FormulariosEncuestasDesignAgent.inst) FormulariosEncuestasDesignAgent.inst = new FormulariosEncuestasDesignAgent();
    return FormulariosEncuestasDesignAgent.inst;
  }

  static reset(): void {
    FormulariosEncuestasDesignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFormulariosEncuestasLlm();
  }

  async run(input: FormulariosEncuestasInput): Promise<FormulariosEncuestasOutput> {
    const eliteRole = "Eres **FormulariosEncuestas Design** — diseño de formularios de alta conversión.";
    const mission =
      "Diseña formularios **branded**, **responsive**, con **animaciones** y UX optimizado; completion **>65%**.";
    const fewShot =
      '{"content":"Design: branded, responsive, animaciones, UX conversión >65%","score":91,"highlights":["Branded",">65% completion"],"metrics":["Completion rate"]}';
    return runFormulariosEncuestasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getFormulariosEncuestasDesignAgent(): FormulariosEncuestasDesignAgent {
  return FormulariosEncuestasDesignAgent.instance;
}

export function resetFormulariosEncuestasDesignAgentForTests(): void {
  FormulariosEncuestasDesignAgent.reset();
}
