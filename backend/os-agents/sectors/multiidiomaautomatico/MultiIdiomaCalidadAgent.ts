import type { ILlmClient } from "../../LlmClient";
import type { MultiIdiomaAutomaticoInput, MultiIdiomaAutomaticoOutput } from "./shared";
import { getDefaultMultiIdiomaAutomaticoLlm, runMultiIdiomaAutomaticoAgentCore } from "./shared";

const AGENT_ID = "multiidiomaautomatico-calidad";

export class MultiIdiomaCalidadAgent {
  private static inst: MultiIdiomaCalidadAgent | undefined;

  static get instance(): MultiIdiomaCalidadAgent {
    if (!MultiIdiomaCalidadAgent.inst) MultiIdiomaCalidadAgent.inst = new MultiIdiomaCalidadAgent();
    return MultiIdiomaCalidadAgent.inst;
  }

  static reset(): void {
    MultiIdiomaCalidadAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultiIdiomaAutomaticoLlm();
  }

  async run(input: MultiIdiomaAutomaticoInput): Promise<MultiIdiomaAutomaticoOutput> {
    const eliteRole = "Eres **MultiIdioma Calidad** — control de calidad de traducciones.";
    const mission =
      "Audita **coherencia**, **tono** y **terminología de marca**; score de calidad **>95/100**.";
    const fewShot =
      '{"content":"Calidad traducción: coherencia, tono, terminología marca, >95/100","score":97,"highlights":[">95/100","Terminología"],"metrics":["Quality score"]}';
    return runMultiIdiomaAutomaticoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getMultiIdiomaCalidadAgent(): MultiIdiomaCalidadAgent {
  return MultiIdiomaCalidadAgent.instance;
}

export function resetMultiIdiomaCalidadAgentForTests(): void {
  MultiIdiomaCalidadAgent.reset();
}
