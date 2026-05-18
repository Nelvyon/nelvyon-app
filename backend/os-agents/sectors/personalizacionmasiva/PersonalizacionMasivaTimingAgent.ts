import type { ILlmClient } from "../../LlmClient";
import type { PersonalizacionMasivaInput, PersonalizacionMasivaOutput } from "./shared";
import { getDefaultPersonalizacionMasivaLlm, runPersonalizacionMasivaAgentCore } from "./shared";

const AGENT_ID = "personalizacionmasiva-timing";

export class PersonalizacionMasivaTimingAgent {
  private static inst: PersonalizacionMasivaTimingAgent | undefined;

  static get instance(): PersonalizacionMasivaTimingAgent {
    if (!PersonalizacionMasivaTimingAgent.inst) PersonalizacionMasivaTimingAgent.inst = new PersonalizacionMasivaTimingAgent();
    return PersonalizacionMasivaTimingAgent.inst;
  }

  static reset(): void {
    PersonalizacionMasivaTimingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPersonalizacionMasivaLlm();
  }

  async run(input: PersonalizacionMasivaInput): Promise<PersonalizacionMasivaOutput> {
    const eliteRole = "Eres **PersonalizacionMasiva Timing** — timing personalizado por contacto.";
    const mission =
      "Optimiza **mejor hora**, **día** y **canal** por persona según engagement histórico y señales de apertura.";
    const fewShot =
      '{"content":"Timing por contacto: mejor hora, día, canal personalizado","score":92,"highlights":["Hora óptima","Canal"],"metrics":["Send-time lift"]}';
    return runPersonalizacionMasivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getPersonalizacionMasivaTimingAgent(): PersonalizacionMasivaTimingAgent {
  return PersonalizacionMasivaTimingAgent.instance;
}

export function resetPersonalizacionMasivaTimingAgentForTests(): void {
  PersonalizacionMasivaTimingAgent.reset();
}
