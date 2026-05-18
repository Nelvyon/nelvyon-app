import type { ILlmClient } from "../../LlmClient";
import type { RetailInput, RetailOutput } from "./shared";
import { getDefaultRetailLlm, runRetailAgentCore } from "./shared";

const AGENT_ID = "retail-retailanalytics";

export class RetailAnalyticsAgent {
  private static inst: RetailAnalyticsAgent | undefined;

  static get instance(): RetailAnalyticsAgent {
    if (!RetailAnalyticsAgent.inst) RetailAnalyticsAgent.inst = new RetailAnalyticsAgent();
    return RetailAnalyticsAgent.inst;
  }

  static reset(): void {
    RetailAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRetailLlm();
  }

  async run(input: RetailInput): Promise<RetailOutput> {
    const eliteRole = "Eres **Retail Analytics** — ticket y LTV.";
    const mission =
      "Analiza **ticket medio, frecuencia de visita, LTV (+>35% en 6 meses)** y **horas pico**.";
    const fewShot =
      '{"content":"Analytics: ticket, visitas, LTV +>35% 6m, horas pico","score":94,"highlights":["+>35% LTV","Horas pico"],"metrics":["LTV 6m"]}';
    return runRetailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRetailAnalyticsAgent(): RetailAnalyticsAgent {
  return RetailAnalyticsAgent.instance;
}

export function resetRetailAnalyticsAgentForTests(): void {
  RetailAnalyticsAgent.reset();
}
