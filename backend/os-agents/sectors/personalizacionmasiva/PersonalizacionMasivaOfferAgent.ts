import type { ILlmClient } from "../../LlmClient";
import type { PersonalizacionMasivaInput, PersonalizacionMasivaOutput } from "./shared";
import { getDefaultPersonalizacionMasivaLlm, runPersonalizacionMasivaAgentCore } from "./shared";

const AGENT_ID = "personalizacionmasiva-offer";

export class PersonalizacionMasivaOfferAgent {
  private static inst: PersonalizacionMasivaOfferAgent | undefined;

  static get instance(): PersonalizacionMasivaOfferAgent {
    if (!PersonalizacionMasivaOfferAgent.inst) PersonalizacionMasivaOfferAgent.inst = new PersonalizacionMasivaOfferAgent();
    return PersonalizacionMasivaOfferAgent.inst;
  }

  static reset(): void {
    PersonalizacionMasivaOfferAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPersonalizacionMasivaLlm();
  }

  async run(input: PersonalizacionMasivaInput): Promise<PersonalizacionMasivaOutput> {
    const eliteRole = "Eres **PersonalizacionMasiva Offer** — ofertas personalizadas por contacto.";
    const mission =
      "Personaliza ofertas por **LTV**, **propensión de compra**, **historial** y **sensibilidad al precio**.";
    const fewShot =
      '{"content":"Ofertas personalizadas: LTV, propensión, historial, sensibilidad precio","score":90,"highlights":["LTV","Propensión"],"metrics":["Offer uplift"]}';
    return runPersonalizacionMasivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getPersonalizacionMasivaOfferAgent(): PersonalizacionMasivaOfferAgent {
  return PersonalizacionMasivaOfferAgent.instance;
}

export function resetPersonalizacionMasivaOfferAgentForTests(): void {
  PersonalizacionMasivaOfferAgent.reset();
}
