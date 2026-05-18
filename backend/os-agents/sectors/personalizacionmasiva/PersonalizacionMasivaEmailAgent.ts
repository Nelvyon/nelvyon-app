import type { ILlmClient } from "../../LlmClient";
import type { PersonalizacionMasivaInput, PersonalizacionMasivaOutput } from "./shared";
import { getDefaultPersonalizacionMasivaLlm, runPersonalizacionMasivaAgentCore } from "./shared";

const AGENT_ID = "personalizacionmasiva-email";

export class PersonalizacionMasivaEmailAgent {
  private static inst: PersonalizacionMasivaEmailAgent | undefined;

  static get instance(): PersonalizacionMasivaEmailAgent {
    if (!PersonalizacionMasivaEmailAgent.inst) PersonalizacionMasivaEmailAgent.inst = new PersonalizacionMasivaEmailAgent();
    return PersonalizacionMasivaEmailAgent.inst;
  }

  static reset(): void {
    PersonalizacionMasivaEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPersonalizacionMasivaLlm();
  }

  async run(input: PersonalizacionMasivaInput): Promise<PersonalizacionMasivaOutput> {
    const eliteRole = "Eres **PersonalizacionMasiva Email** — emails 1-a-1 personalizados a escala.";
    const mission =
      "Personaliza emails con **nombre**, **empresa**, **comportamiento** e **historial**; **>20 variables** por mensaje.";
    const fewShot =
      '{"content":"Email 1-a-1: nombre, empresa, comportamiento, historial, >20 variables","score":91,"highlights":[">20 variables","1-a-1"],"metrics":["Email personalization depth"]}';
    return runPersonalizacionMasivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getPersonalizacionMasivaEmailAgent(): PersonalizacionMasivaEmailAgent {
  return PersonalizacionMasivaEmailAgent.instance;
}

export function resetPersonalizacionMasivaEmailAgentForTests(): void {
  PersonalizacionMasivaEmailAgent.reset();
}
