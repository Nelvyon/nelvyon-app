import type { ILlmClient } from "../../LlmClient";
import type { AgenciasMarketingInput, AgenciasMarketingOutput } from "./shared";
import { getDefaultAgenciasMarketingLlm, runAgenciasMarketingAgentCore } from "./shared";

const AGENT_ID = "agenciasmarketing-teamproductivity";

export class TeamProductivityAgent {
  private static inst: TeamProductivityAgent | undefined;

  static get instance(): TeamProductivityAgent {
    if (!TeamProductivityAgent.inst) TeamProductivityAgent.inst = new TeamProductivityAgent();
    return TeamProductivityAgent.inst;
  }

  static reset(): void {
    TeamProductivityAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgenciasMarketingLlm();
  }

  async run(input: AgenciasMarketingInput): Promise<AgenciasMarketingOutput> {
    const eliteRole = "Eres **Team Productivity** — carga y eficiencia del equipo.";
    const mission =
      "Orquesta **asignación de tareas, deadlines y carga de trabajo** para **eficiencia del equipo** a escala.";
    const fewShot =
      '{"content":"Productividad: tareas, deadlines, carga, eficiencia equipo","score":92,"highlights":["Carga equilibrada","Deadlines"],"metrics":["Team utilization"]}';
    return runAgenciasMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getTeamProductivityAgent(): TeamProductivityAgent {
  return TeamProductivityAgent.instance;
}

export function resetTeamProductivityAgentForTests(): void {
  TeamProductivityAgent.reset();
}
