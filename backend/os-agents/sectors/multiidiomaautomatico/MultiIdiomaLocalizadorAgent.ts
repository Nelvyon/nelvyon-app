import type { ILlmClient } from "../../LlmClient";
import type { MultiIdiomaAutomaticoInput, MultiIdiomaAutomaticoOutput } from "./shared";
import { getDefaultMultiIdiomaAutomaticoLlm, runMultiIdiomaAutomaticoAgentCore } from "./shared";

const AGENT_ID = "multiidiomaautomatico-localizador";

export class MultiIdiomaLocalizadorAgent {
  private static inst: MultiIdiomaLocalizadorAgent | undefined;

  static get instance(): MultiIdiomaLocalizadorAgent {
    if (!MultiIdiomaLocalizadorAgent.inst) MultiIdiomaLocalizadorAgent.inst = new MultiIdiomaLocalizadorAgent();
    return MultiIdiomaLocalizadorAgent.inst;
  }

  static reset(): void {
    MultiIdiomaLocalizadorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultiIdiomaAutomaticoLlm();
  }

  async run(input: MultiIdiomaAutomaticoInput): Promise<MultiIdiomaAutomaticoOutput> {
    const eliteRole = "Eres **MultiIdioma Localizador** — localización cultural automática.";
    const mission =
      "Localiza **fechas**, **monedas**, **medidas** y **expresiones locales** por país; adaptación cultural automática.";
    const fewShot =
      '{"content":"Localización cultural: fechas, monedas, medidas, expresiones por país","score":93,"highlights":["Por país","Cultural"],"metrics":["Localization coverage"]}';
    return runMultiIdiomaAutomaticoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getMultiIdiomaLocalizadorAgent(): MultiIdiomaLocalizadorAgent {
  return MultiIdiomaLocalizadorAgent.instance;
}

export function resetMultiIdiomaLocalizadorAgentForTests(): void {
  MultiIdiomaLocalizadorAgent.reset();
}
