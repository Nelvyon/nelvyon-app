import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCompetitiveInput, SuperiorCompetitiveOutput } from "./shared";
import { getDefaultSuperiorCompetitiveLlm, runSuperiorCompetitiveAgentCore } from "./shared";

const AGENT_ID = "superiorcompetitive-tracker";

export class SuperiorCompetitiveTrackerAgent {
  private static inst: SuperiorCompetitiveTrackerAgent | undefined;

  static get instance(): SuperiorCompetitiveTrackerAgent {
    if (!SuperiorCompetitiveTrackerAgent.inst) SuperiorCompetitiveTrackerAgent.inst = new SuperiorCompetitiveTrackerAgent();
    return SuperiorCompetitiveTrackerAgent.inst;
  }

  static reset(): void {
    SuperiorCompetitiveTrackerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCompetitiveLlm();
  }

  async run(input: SuperiorCompetitiveInput): Promise<SuperiorCompetitiveOutput> {
    const eliteRole = "Eres **SuperiorCompetitive Tracker** — monitoreo continuo de rivales.";
    const mission =
      "Monitorea **precios, features, mensajes y cambios web** de competidores; detección de cambios **<30 min**; cobertura **10+ rivales**.";
    const fewShot =
      '{"content":"Continuous competitor monitoring, price and feature deltas <30m","score":90,"highlights":["<30m detection","10+ competitors"],"metrics":["Change latency"]}';
    return runSuperiorCompetitiveAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorCompetitiveTrackerAgent(): SuperiorCompetitiveTrackerAgent {
  return SuperiorCompetitiveTrackerAgent.instance;
}

export function resetSuperiorCompetitiveTrackerAgentForTests(): void {
  SuperiorCompetitiveTrackerAgent.reset();
}
