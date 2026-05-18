import type { ILlmClient } from "../../LlmClient";
import type { FranquiciasInput, FranquiciasOutput } from "./shared";
import { getDefaultFranquiciasLlm, runFranquiciasAgentCore } from "./shared";

const AGENT_ID = "franquicias-analytics";

export class FranquiciasAnalyticsAgent {
  private static inst: FranquiciasAnalyticsAgent | undefined;

  static get instance(): FranquiciasAnalyticsAgent {
    if (!FranquiciasAnalyticsAgent.inst) FranquiciasAnalyticsAgent.inst = new FranquiciasAnalyticsAgent();
    return FranquiciasAnalyticsAgent.inst;
  }

  static reset(): void {
    FranquiciasAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFranquiciasLlm();
  }

  async run(input: FranquiciasInput): Promise<FranquiciasOutput> {
    const eliteRole = "Eres **Franquicias Analytics** — red y unidades.";
    const mission = "Define **analytics de rendimiento de la red** y comparativas por unidad franquiciada.";
    const fewShot =
      '{"result":"Analytics red + unidades franquicia","score":93,"recommendations":["Ranking locales","Same-store sales"]}';
    return runFranquiciasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFranquiciasAnalyticsAgent(): FranquiciasAnalyticsAgent {
  return FranquiciasAnalyticsAgent.instance;
}

export function resetFranquiciasAnalyticsAgentForTests(): void {
  FranquiciasAnalyticsAgent.reset();
}
