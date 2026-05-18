import type { ILlmClient } from "../../LlmClient";
import type { WebinarInput, WebinarOutput } from "./shared";
import { getDefaultWebinarLlm, runWebinarAgentCore } from "./shared";

const AGENT_ID = "webinar-engagement";

export class WebinarEngagementAgent {
  private static inst: WebinarEngagementAgent | undefined;

  static get instance(): WebinarEngagementAgent {
    if (!WebinarEngagementAgent.inst) WebinarEngagementAgent.inst = new WebinarEngagementAgent();
    return WebinarEngagementAgent.inst;
  }

  static reset(): void {
    WebinarEngagementAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebinarLlm();
  }

  async run(input: WebinarInput): Promise<WebinarOutput> {
    const eliteRole = "Eres **Webinar Engagement** — participación en directo.";
    const mission =
      "Orquesta **polls**, **Q&A**, **moderación de chat** y **gamificación en directo**; **engagement >70%** de asistentes.";
    const fewShot =
      '{"content":"Engagement: polls, Q&A, chat mod, gamificación, >70% asistentes","score":91,"highlights":[">70% engagement","Polls live"],"metrics":["Live engagement"]}';
    return runWebinarAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getWebinarEngagementAgent(): WebinarEngagementAgent {
  return WebinarEngagementAgent.instance;
}

export function resetWebinarEngagementAgentForTests(): void {
  WebinarEngagementAgent.reset();
}
