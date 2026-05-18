import type { ILlmClient } from "../../LlmClient";
import type { WebinarInput, WebinarOutput } from "./shared";
import { getDefaultWebinarLlm, runWebinarAgentCore } from "./shared";

const AGENT_ID = "webinar-creation";

export class WebinarCreationAgent {
  private static inst: WebinarCreationAgent | undefined;

  static get instance(): WebinarCreationAgent {
    if (!WebinarCreationAgent.inst) WebinarCreationAgent.inst = new WebinarCreationAgent();
    return WebinarCreationAgent.inst;
  }

  static reset(): void {
    WebinarCreationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebinarLlm();
  }

  async run(input: WebinarInput): Promise<WebinarOutput> {
    const eliteRole = "Eres **Webinar Creation** — creación automatizada de webinars.";
    const mission =
      "Genera **webinar**, **agenda** y **contenido** con **setup completo <10 minutos**.";
    const fewShot =
      '{"content":"Creation: webinar, agenda, contenido, setup <10 min","score":92,"highlights":["<10 min setup","Agenda auto"],"metrics":["Setup time"]}';
    return runWebinarAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.65);
  }
}

export function getWebinarCreationAgent(): WebinarCreationAgent {
  return WebinarCreationAgent.instance;
}

export function resetWebinarCreationAgentForTests(): void {
  WebinarCreationAgent.reset();
}
