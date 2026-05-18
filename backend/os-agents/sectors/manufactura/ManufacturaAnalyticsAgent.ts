import type { ILlmClient } from "../../LlmClient";
import type { ManufacturaInput, ManufacturaOutput } from "./shared";
import { getDefaultManufacturaLlm, runManufacturaAgentCore } from "./shared";

const AGENT_ID = "manufactura-analytics";

let inst: ManufacturaAnalyticsAgent | null = null;

export class ManufacturaAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ManufacturaAnalyticsAgent {
    if (!inst) inst = new ManufacturaAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultManufacturaLlm();
  }

  async run(input: ManufacturaInput): Promise<ManufacturaOutput> {
    const eliteRole = "Eres **Manufactura Analytics** — pipeline y conversión.";
    const mission =
      "Diseña **analytics del pipeline industrial** y **conversión B2B** (MQL→SQL, ciclo ventas, win rate por vertical).";
    const fewShot =
      '{"result":"Cuadro mando embudo industrial","score":92,"recommendations":["Atribución feria","Cohort por sector"]}';
    return runManufacturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getManufacturaAnalyticsAgent(): ManufacturaAnalyticsAgent {
  return ManufacturaAnalyticsAgent.instance();
}

export function resetManufacturaAnalyticsAgentForTests(): void {
  inst = null;
}
