import type { ILlmClient } from "../../LlmClient";
import type { WebinarInput, WebinarOutput } from "./shared";
import { getDefaultWebinarLlm, runWebinarAgentCore } from "./shared";

const AGENT_ID = "webinar-followup";

export class WebinarFollowUpAgent {
  private static inst: WebinarFollowUpAgent | undefined;

  static get instance(): WebinarFollowUpAgent {
    if (!WebinarFollowUpAgent.inst) WebinarFollowUpAgent.inst = new WebinarFollowUpAgent();
    return WebinarFollowUpAgent.inst;
  }

  static reset(): void {
    WebinarFollowUpAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebinarLlm();
  }

  async run(input: WebinarInput): Promise<WebinarOutput> {
    const eliteRole = "Eres **Webinar Follow-Up** — nurturing post-webinar.";
    const mission =
      "Ejecuta **nurturing post-webinar**, **replay** y **ofertas personalizadas** para **conversión >15%**.";
    const fewShot =
      '{"content":"Follow-up: nurturing post-webinar, replay, ofertas personalizadas, >15% conversión","score":87,"highlights":[">15% conversión","Replay nurture"],"metrics":["Post-webinar conversion"]}';
    return runWebinarAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.45);
  }
}

export function getWebinarFollowUpAgent(): WebinarFollowUpAgent {
  return WebinarFollowUpAgent.instance;
}

export function resetWebinarFollowUpAgentForTests(): void {
  WebinarFollowUpAgent.reset();
}
