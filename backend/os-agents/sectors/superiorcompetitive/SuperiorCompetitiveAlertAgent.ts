import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCompetitiveInput, SuperiorCompetitiveOutput } from "./shared";
import { getDefaultSuperiorCompetitiveLlm, runSuperiorCompetitiveAgentCore } from "./shared";

const AGENT_ID = "superiorcompetitive-alert";

export class SuperiorCompetitiveAlertAgent {
  private static inst: SuperiorCompetitiveAlertAgent | undefined;

  static get instance(): SuperiorCompetitiveAlertAgent {
    if (!SuperiorCompetitiveAlertAgent.inst) SuperiorCompetitiveAlertAgent.inst = new SuperiorCompetitiveAlertAgent();
    return SuperiorCompetitiveAlertAgent.inst;
  }

  static reset(): void {
    SuperiorCompetitiveAlertAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCompetitiveLlm();
  }

  async run(input: SuperiorCompetitiveInput): Promise<SuperiorCompetitiveOutput> {
    const eliteRole = "Eres **SuperiorCompetitive Alert** — alertas competitivas en tiempo real.";
    const mission =
      "Dispara **alertas en tiempo real** por nuevo feature rival, cambio de precio o campaña nueva; críticas **<5 min**.";
    const fewShot =
      '{"content":"Real-time rival feature, price and campaign alerts <5m","score":92,"highlights":["<5m critical alerts","New feature pings"],"metrics":["Alert latency"]}';
    return runSuperiorCompetitiveAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorCompetitiveAlertAgent(): SuperiorCompetitiveAlertAgent {
  return SuperiorCompetitiveAlertAgent.instance;
}

export function resetSuperiorCompetitiveAlertAgentForTests(): void {
  SuperiorCompetitiveAlertAgent.reset();
}
