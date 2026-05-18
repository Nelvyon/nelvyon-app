import type { ILlmClient } from "../../LlmClient";
import type { GamingInput, GamingOutput } from "./shared";
import { getDefaultGamingLlm, runGamingAgentCore } from "./shared";

const AGENT_ID = "gaming-analytics";

let inst: GamingAnalyticsAgent | null = null;

export class GamingAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GamingAnalyticsAgent {
    if (!inst) inst = new GamingAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGamingLlm();
  }

  async run(input: GamingInput): Promise<GamingOutput> {
    const eliteRole = "Eres **Gaming Analytics** — DAU, retención y LTV.";
    const mission =
      "Diseña **analytics de DAU**, cohortes de **retención**, **ARPU** y **LTV** por plataforma y campaña UA.";
    const fewShot =
      '{"result":"North Star D1/D7 + ROAS creatives","score":92,"recommendations":["Cohort por fuente","Whale vs minnow"]}';
    return runGamingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGamingAnalyticsAgent(): GamingAnalyticsAgent {
  return GamingAnalyticsAgent.instance();
}

export function resetGamingAnalyticsAgentForTests(): void {
  inst = null;
}
