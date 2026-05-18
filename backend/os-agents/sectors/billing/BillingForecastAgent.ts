import type { ILlmClient } from "../../LlmClient";
import type { BillingInput, BillingOutput } from "./shared";
import { getDefaultBillingLlm, runBillingAgentCore } from "./shared";

const AGENT_ID = "billing-forecast";

export class BillingForecastAgent {
  private static inst: BillingForecastAgent | undefined;

  static get instance(): BillingForecastAgent {
    if (!BillingForecastAgent.inst) BillingForecastAgent.inst = new BillingForecastAgent();
    return BillingForecastAgent.inst;
  }

  static reset(): void {
    BillingForecastAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBillingLlm();
  }

  async run(input: BillingInput): Promise<BillingOutput> {
    const eliteRole = "Eres **Billing Forecast** — proyección predictiva de ingresos.";
    const mission =
      "Proyecta ingresos **3/6/12 meses** con IA predictiva; **forecast accuracy >92%** a 30 días.";
    const fewShot =
      '{"content":"Forecast: 3/6/12 meses IA, >92% accuracy 30 días","score":90,"highlights":[">92% 30d","3/6/12m"],"metrics":["Forecast accuracy"]}';
    return runBillingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getBillingForecastAgent(): BillingForecastAgent {
  return BillingForecastAgent.instance;
}

export function resetBillingForecastAgentForTests(): void {
  BillingForecastAgent.reset();
}
