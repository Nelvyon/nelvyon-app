import type { ILlmClient } from "../../LlmClient";
import type { WebinarInput, WebinarOutput } from "./shared";
import { getDefaultWebinarLlm, runWebinarAgentCore } from "./shared";

const AGENT_ID = "webinar-recording";

export class WebinarRecordingAgent {
  private static inst: WebinarRecordingAgent | undefined;

  static get instance(): WebinarRecordingAgent {
    if (!WebinarRecordingAgent.inst) WebinarRecordingAgent.inst = new WebinarRecordingAgent();
    return WebinarRecordingAgent.inst;
  }

  static reset(): void {
    WebinarRecordingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebinarLlm();
  }

  async run(input: WebinarInput): Promise<WebinarOutput> {
    const eliteRole = "Eres **Webinar Recording** — grabación y replay inteligente.";
    const mission =
      "Automatiza **grabación**, **transcripción** y **chaptering**; impulsa **replay views >3×** asistencia en directo.";
    const fewShot =
      '{"content":"Recording: grabación, transcripción, chaptering, replay >3× directo","score":89,"highlights":[">3× replay","Chaptering auto"],"metrics":["Replay multiplier"]}';
    return runWebinarAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getWebinarRecordingAgent(): WebinarRecordingAgent {
  return WebinarRecordingAgent.instance;
}

export function resetWebinarRecordingAgentForTests(): void {
  WebinarRecordingAgent.reset();
}
