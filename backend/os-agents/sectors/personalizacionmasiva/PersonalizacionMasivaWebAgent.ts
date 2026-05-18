import type { ILlmClient } from "../../LlmClient";
import type { PersonalizacionMasivaInput, PersonalizacionMasivaOutput } from "./shared";
import { getDefaultPersonalizacionMasivaLlm, runPersonalizacionMasivaAgentCore } from "./shared";

const AGENT_ID = "personalizacionmasiva-web";

export class PersonalizacionMasivaWebAgent {
  private static inst: PersonalizacionMasivaWebAgent | undefined;

  static get instance(): PersonalizacionMasivaWebAgent {
    if (!PersonalizacionMasivaWebAgent.inst) PersonalizacionMasivaWebAgent.inst = new PersonalizacionMasivaWebAgent();
    return PersonalizacionMasivaWebAgent.inst;
  }

  static reset(): void {
    PersonalizacionMasivaWebAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPersonalizacionMasivaLlm();
  }

  async run(input: PersonalizacionMasivaInput): Promise<PersonalizacionMasivaOutput> {
    const eliteRole = "Eres **PersonalizacionMasiva Web** — personalización web en tiempo real.";
    const mission =
      "Personaliza **hero**, **CTA**, **precios** y **recomendaciones** por visitante; latencia **<100ms**.";
    const fewShot =
      '{"content":"Web RT: hero, CTA, precios, recomendaciones, <100ms","score":89,"highlights":["<100ms","Por visitante"],"metrics":["Web latency"]}';
    return runPersonalizacionMasivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getPersonalizacionMasivaWebAgent(): PersonalizacionMasivaWebAgent {
  return PersonalizacionMasivaWebAgent.instance;
}

export function resetPersonalizacionMasivaWebAgentForTests(): void {
  PersonalizacionMasivaWebAgent.reset();
}
