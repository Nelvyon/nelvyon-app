import type { ILlmClient } from "../../LlmClient";
import type { WebinarInput, WebinarOutput } from "./shared";
import { getDefaultWebinarLlm, runWebinarAgentCore } from "./shared";

const AGENT_ID = "webinar-videohosting";

export class WebinarVideoHostingAgent {
  private static inst: WebinarVideoHostingAgent | undefined;

  static get instance(): WebinarVideoHostingAgent {
    if (!WebinarVideoHostingAgent.inst) WebinarVideoHostingAgent.inst = new WebinarVideoHostingAgent();
    return WebinarVideoHostingAgent.inst;
  }

  static reset(): void {
    WebinarVideoHostingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebinarLlm();
  }

  async run(input: WebinarInput): Promise<WebinarOutput> {
    const eliteRole = "Eres **Webinar Video Hosting** — hosting y entrega global de vídeo.";
    const mission =
      "Optimiza **hosting de vídeo**, **CDN global** y **thumbnails IA** para replay **>3×** asistencia en directo.";
    const fewShot =
      '{"content":"Video hosting: CDN global, thumbnails IA, replay >3× directo","score":91,"highlights":["CDN global","Thumbnails IA"],"metrics":["Replay delivery"]}';
    return runWebinarAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getWebinarVideoHostingAgent(): WebinarVideoHostingAgent {
  return WebinarVideoHostingAgent.instance;
}

export function resetWebinarVideoHostingAgentForTests(): void {
  WebinarVideoHostingAgent.reset();
}
