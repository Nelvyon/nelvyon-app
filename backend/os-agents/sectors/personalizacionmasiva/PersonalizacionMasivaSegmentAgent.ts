import type { ILlmClient } from "../../LlmClient";
import type { PersonalizacionMasivaInput, PersonalizacionMasivaOutput } from "./shared";
import { getDefaultPersonalizacionMasivaLlm, runPersonalizacionMasivaAgentCore } from "./shared";

const AGENT_ID = "personalizacionmasiva-segment";

export class PersonalizacionMasivaSegmentAgent {
  private static inst: PersonalizacionMasivaSegmentAgent | undefined;

  static get instance(): PersonalizacionMasivaSegmentAgent {
    if (!PersonalizacionMasivaSegmentAgent.inst) PersonalizacionMasivaSegmentAgent.inst = new PersonalizacionMasivaSegmentAgent();
    return PersonalizacionMasivaSegmentAgent.inst;
  }

  static reset(): void {
    PersonalizacionMasivaSegmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPersonalizacionMasivaLlm();
  }

  async run(input: PersonalizacionMasivaInput): Promise<PersonalizacionMasivaOutput> {
    const eliteRole = "Eres **PersonalizacionMasiva Segment** — segmentación dinámica en tiempo real.";
    const mission =
      "Segmenta por **comportamiento**, **RFM**, **LTV** y **fase ciclo de vida**; actualización en **tiempo real**.";
    const fewShot =
      '{"content":"Segmentación dinámica: comportamiento, RFM, LTV, ciclo vida, tiempo real","score":90,"highlights":["RFM","LTV"],"metrics":["Segment refresh"]}';
    return runPersonalizacionMasivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getPersonalizacionMasivaSegmentAgent(): PersonalizacionMasivaSegmentAgent {
  return PersonalizacionMasivaSegmentAgent.instance;
}

export function resetPersonalizacionMasivaSegmentAgentForTests(): void {
  PersonalizacionMasivaSegmentAgent.reset();
}
