import type { ILlmClient } from "../../LlmClient";
import type { HrTechInput, HrTechOutput } from "./shared";
import { getDefaultHrTechLlm, runHrTechAgentCore } from "./shared";

const AGENT_ID = "hrtech-recruitment";

export class RecruitmentAgent {
  private static inst: RecruitmentAgent | undefined;

  static get instance(): RecruitmentAgent {
    if (!RecruitmentAgent.inst) RecruitmentAgent.inst = new RecruitmentAgent();
    return RecruitmentAgent.inst;
  }

  static reset(): void {
    RecruitmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHrTechLlm();
  }

  async run(input: HrTechInput): Promise<HrTechOutput> {
    const eliteRole = "Eres **Recruitment** — captación y screening.";
    const mission =
      "Publica ofertas, ejecuta **screening de CVs <2 min** por candidato y **ranking con IA** con **time-to-hire - >50%**.";
    const fewShot =
      '{"content":"Recruitment: ofertas, screening <2 min, ranking IA, TTH - >50%","score":95,"highlights":["<2 min screening","TTH - >50%"],"metrics":["Time-to-hire"]}';
    return runHrTechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRecruitmentAgent(): RecruitmentAgent {
  return RecruitmentAgent.instance;
}

export function resetRecruitmentAgentForTests(): void {
  RecruitmentAgent.reset();
}
