import type { ILlmClient } from "../../LlmClient";
import type { MultiIdiomaAutomaticoInput, MultiIdiomaAutomaticoOutput } from "./shared";
import { getDefaultMultiIdiomaAutomaticoLlm, runMultiIdiomaAutomaticoAgentCore } from "./shared";

const AGENT_ID = "multiidiomaautomatico-email";

export class MultiIdiomaEmailAgent {
  private static inst: MultiIdiomaEmailAgent | undefined;

  static get instance(): MultiIdiomaEmailAgent {
    if (!MultiIdiomaEmailAgent.inst) MultiIdiomaEmailAgent.inst = new MultiIdiomaEmailAgent();
    return MultiIdiomaEmailAgent.inst;
  }

  static reset(): void {
    MultiIdiomaEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultiIdiomaAutomaticoLlm();
  }

  async run(input: MultiIdiomaAutomaticoInput): Promise<MultiIdiomaAutomaticoOutput> {
    const eliteRole = "Eres **MultiIdioma Email** — emails en idioma nativo del contacto.";
    const mission =
      "Envía emails en **idioma nativo**; **plantillas por idioma** y **personalización cultural** por mercado.";
    const fewShot =
      '{"content":"Email nativo: plantillas por idioma, personalización cultural","score":91,"highlights":["Idioma nativo","Plantillas"],"metrics":["Email locale match"]}';
    return runMultiIdiomaAutomaticoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getMultiIdiomaEmailAgent(): MultiIdiomaEmailAgent {
  return MultiIdiomaEmailAgent.instance;
}

export function resetMultiIdiomaEmailAgentForTests(): void {
  MultiIdiomaEmailAgent.reset();
}
