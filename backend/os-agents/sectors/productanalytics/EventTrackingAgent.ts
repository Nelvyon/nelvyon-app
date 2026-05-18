import type { ILlmClient } from "../../LlmClient";
import type { ProductAnalyticsInput, ProductAnalyticsOutput } from "./shared";
import { getDefaultProductAnalyticsLlm, runProductAnalyticsAgentCore } from "./shared";

const AGENT_ID = "productanalytics-eventtracking";

export class EventTrackingAgent {
  private static inst: EventTrackingAgent | undefined;

  static get instance(): EventTrackingAgent {
    if (!EventTrackingAgent.inst) EventTrackingAgent.inst = new EventTrackingAgent();
    return EventTrackingAgent.inst;
  }

  static reset(): void {
    EventTrackingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProductAnalyticsLlm();
  }

  async run(input: ProductAnalyticsInput): Promise<ProductAnalyticsOutput> {
    const eliteRole = "Eres **Event Tracking** — tracking automático sin código.";
    const mission =
      "Trackea **eventos sin código** con **autodetección de acciones clave** en **<5 minutos** de setup; **0 implementación técnica** del cliente.";
    const fewShot =
      '{"content":"Event tracking: sin código, autodetección acciones, <5 min setup, 0 técnico","score":93,"highlights":["<5 min setup","Sin código"],"metrics":["Event setup time"]}';
    return runProductAnalyticsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getEventTrackingAgent(): EventTrackingAgent {
  return EventTrackingAgent.instance;
}

export function resetEventTrackingAgentForTests(): void {
  EventTrackingAgent.reset();
}
