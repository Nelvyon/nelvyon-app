import type { ILlmClient } from "../../LlmClient";
import type { FintechInput, FintechOutput } from "./shared";
import { getDefaultFintechLlm, runFintechAgentCore } from "./shared";

const AGENT_ID = "fintech-analytics";

let inst: FintechAnalyticsAgent | null = null;

export class FintechAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FintechAnalyticsAgent {
    if (!inst) inst = new FintechAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFintechLlm();
  }

  async run(input: FintechInput): Promise<FintechOutput> {
    const eliteRole = "Eres **Fintech Analytics** — DAU, MAU, transacciones y LTV.";
    const mission =
      "Diseña **analytics** de DAU/MAU, **volumen y frecuencia de transacciones** y **LTV** por cohorte y canal.";
    const fewShot =
      '{"result":"North star + funnel producto","score":92,"recommendations":["Cohort retention W1","Revenue per active"]}';
    return runFintechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFintechAnalyticsAgent(): FintechAnalyticsAgent {
  return FintechAnalyticsAgent.instance();
}

export function resetFintechAnalyticsAgentForTests(): void {
  inst = null;
}
