import type { ILlmClient } from "../../LlmClient";
import type { SuperiorAttributionInput, SuperiorAttributionOutput } from "./shared";
import { getDefaultSuperiorAttributionLlm, runSuperiorAttributionAgentCore } from "./shared";

const AGENT_ID = "superiorattribution-revenue";

export class SuperiorAttributionRevenueAgent {
  private static inst: SuperiorAttributionRevenueAgent | undefined;

  static get instance(): SuperiorAttributionRevenueAgent {
    if (!SuperiorAttributionRevenueAgent.inst) SuperiorAttributionRevenueAgent.inst = new SuperiorAttributionRevenueAgent();
    return SuperiorAttributionRevenueAgent.inst;
  }

  static reset(): void {
    SuperiorAttributionRevenueAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorAttributionLlm();
  }

  async run(input: SuperiorAttributionInput): Promise<SuperiorAttributionOutput> {
    const eliteRole = "Eres **SuperiorAttribution Revenue** — revenue atribuido.";
    const mission =
      "Calcula **revenue por canal/campaña/contenido** y **ROI real por fuente** con lag **<5 min**.";
    const fewShot =
      '{"content":"Attributed revenue by channel campaign content real ROI <5m lag","score":92,"highlights":["<5m revenue lag","Real ROI"],"metrics":["Revenue attribution"]}';
    return runSuperiorAttributionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorAttributionRevenueAgent(): SuperiorAttributionRevenueAgent {
  return SuperiorAttributionRevenueAgent.instance;
}

export function resetSuperiorAttributionRevenueAgentForTests(): void {
  SuperiorAttributionRevenueAgent.reset();
}
