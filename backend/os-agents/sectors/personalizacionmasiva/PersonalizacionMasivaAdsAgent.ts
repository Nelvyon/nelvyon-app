import type { ILlmClient } from "../../LlmClient";
import type { PersonalizacionMasivaInput, PersonalizacionMasivaOutput } from "./shared";
import { getDefaultPersonalizacionMasivaLlm, runPersonalizacionMasivaAgentCore } from "./shared";

const AGENT_ID = "personalizacionmasiva-ads";

export class PersonalizacionMasivaAdsAgent {
  private static inst: PersonalizacionMasivaAdsAgent | undefined;

  static get instance(): PersonalizacionMasivaAdsAgent {
    if (!PersonalizacionMasivaAdsAgent.inst) PersonalizacionMasivaAdsAgent.inst = new PersonalizacionMasivaAdsAgent();
    return PersonalizacionMasivaAdsAgent.inst;
  }

  static reset(): void {
    PersonalizacionMasivaAdsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPersonalizacionMasivaLlm();
  }

  async run(input: PersonalizacionMasivaInput): Promise<PersonalizacionMasivaOutput> {
    const eliteRole = "Eres **PersonalizacionMasiva Ads** — audiencias personalizadas para ads.";
    const mission =
      "Construye **lookalikes**, **retargeting dinámico** y **exclusiones inteligentes** por señal de comportamiento.";
    const fewShot =
      '{"content":"Ads personalizados: lookalikes, retargeting dinámico, exclusiones inteligentes","score":87,"highlights":["Lookalikes","Retargeting"],"metrics":["Audience precision"]}';
    return runPersonalizacionMasivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getPersonalizacionMasivaAdsAgent(): PersonalizacionMasivaAdsAgent {
  return PersonalizacionMasivaAdsAgent.instance;
}

export function resetPersonalizacionMasivaAdsAgentForTests(): void {
  PersonalizacionMasivaAdsAgent.reset();
}
