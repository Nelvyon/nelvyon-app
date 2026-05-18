import type { ILlmClient } from "../../LlmClient";
import type { WebinarInput, WebinarOutput } from "./shared";
import { getDefaultWebinarLlm, runWebinarAgentCore } from "./shared";

const AGENT_ID = "webinar-promotion";

export class WebinarPromotionAgent {
  private static inst: WebinarPromotionAgent | undefined;

  static get instance(): WebinarPromotionAgent {
    if (!WebinarPromotionAgent.inst) WebinarPromotionAgent.inst = new WebinarPromotionAgent();
    return WebinarPromotionAgent.inst;
  }

  static reset(): void {
    WebinarPromotionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebinarLlm();
  }

  async run(input: WebinarInput): Promise<WebinarOutput> {
    const eliteRole = "Eres **Webinar Promotion** — promoción multicanal automatizada.";
    const mission =
      "Lanza **landing page**, **emails**, **RRSS** y **countdown automático** para **asistencia >60%** de registrados.";
    const fewShot =
      '{"content":"Promotion: landing, emails, RRSS, countdown, >60% asistencia","score":90,"highlights":[">60% asistencia","Countdown auto"],"metrics":["Attendance rate"]}';
    return runWebinarAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getWebinarPromotionAgent(): WebinarPromotionAgent {
  return WebinarPromotionAgent.instance;
}

export function resetWebinarPromotionAgentForTests(): void {
  WebinarPromotionAgent.reset();
}
