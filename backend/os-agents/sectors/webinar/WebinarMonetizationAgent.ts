import type { ILlmClient } from "../../LlmClient";
import type { WebinarInput, WebinarOutput } from "./shared";
import { getDefaultWebinarLlm, runWebinarAgentCore } from "./shared";

const AGENT_ID = "webinar-monetization";

export class WebinarMonetizationAgent {
  private static inst: WebinarMonetizationAgent | undefined;

  static get instance(): WebinarMonetizationAgent {
    if (!WebinarMonetizationAgent.inst) WebinarMonetizationAgent.inst = new WebinarMonetizationAgent();
    return WebinarMonetizationAgent.inst;
  }

  static reset(): void {
    WebinarMonetizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebinarLlm();
  }

  async run(input: WebinarInput): Promise<WebinarOutput> {
    const eliteRole = "Eres **Webinar Monetization** — ingresos por evento.";
    const mission =
      "Activa **tickets**, **upsell**, **replay premium** y **sponsors**; **revenue/webinar >2.000€** automático.";
    const fewShot =
      '{"content":"Monetization: tickets, upsell, replay premium, sponsors, >2.000€/webinar","score":90,"highlights":[">2.000€/webinar","Replay premium"],"metrics":["Revenue per webinar"]}';
    return runWebinarAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getWebinarMonetizationAgent(): WebinarMonetizationAgent {
  return WebinarMonetizationAgent.instance;
}

export function resetWebinarMonetizationAgentForTests(): void {
  WebinarMonetizationAgent.reset();
}
