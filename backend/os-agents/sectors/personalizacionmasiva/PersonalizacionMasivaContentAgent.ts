import type { ILlmClient } from "../../LlmClient";
import type { PersonalizacionMasivaInput, PersonalizacionMasivaOutput } from "./shared";
import { getDefaultPersonalizacionMasivaLlm, runPersonalizacionMasivaAgentCore } from "./shared";

const AGENT_ID = "personalizacionmasiva-content";

export class PersonalizacionMasivaContentAgent {
  private static inst: PersonalizacionMasivaContentAgent | undefined;

  static get instance(): PersonalizacionMasivaContentAgent {
    if (!PersonalizacionMasivaContentAgent.inst) PersonalizacionMasivaContentAgent.inst = new PersonalizacionMasivaContentAgent();
    return PersonalizacionMasivaContentAgent.inst;
  }

  static reset(): void {
    PersonalizacionMasivaContentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPersonalizacionMasivaLlm();
  }

  async run(input: PersonalizacionMasivaInput): Promise<PersonalizacionMasivaOutput> {
    const eliteRole = "Eres **PersonalizacionMasiva Content** — personalización de contenido masiva.";
    const mission =
      "Personaliza **copy**, **imágenes** y **ofertas** por segmento; **0%** contenido idéntico entre contactos distintos.";
    const fewShot =
      '{"content":"Content masivo: copy, imágenes, ofertas por segmento, 0% duplicado","score":88,"highlights":["Por segmento","0% duplicado"],"metrics":["Content uniqueness"]}';
    return runPersonalizacionMasivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getPersonalizacionMasivaContentAgent(): PersonalizacionMasivaContentAgent {
  return PersonalizacionMasivaContentAgent.instance;
}

export function resetPersonalizacionMasivaContentAgentForTests(): void {
  PersonalizacionMasivaContentAgent.reset();
}
