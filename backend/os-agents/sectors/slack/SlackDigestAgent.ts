import type { ILlmClient } from "../../LlmClient";
import type { SlackInput, SlackOutput } from "./shared";
import { getDefaultSlackLlm, runSlackAgentCore } from "./shared";

const AGENT_ID = "slack-digest";

export class SlackDigestAgent {
  private static inst: SlackDigestAgent | undefined;

  static get instance(): SlackDigestAgent {
    if (!SlackDigestAgent.inst) SlackDigestAgent.inst = new SlackDigestAgent();
    return SlackDigestAgent.inst;
  }

  static reset(): void {
    SlackDigestAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSlackLlm();
  }

  async run(input: SlackInput): Promise<SlackOutput> {
    const eliteRole =
      "Eres **Slack Digest Curator** — resumen matinal por canal con KPIs del día anterior.";
    const mission =
      "Genera **digest diario** enviado **09:00 hora local** con KPIs del **día anterior** por canal; Block Kit con secciones y campos comparativos.";
    const fewShot =
      '{"content":"09:00 local digest prior-day KPIs per channel","score":90,"highlights":["09:00 schedule","Prior-day KPIs"],"metrics":["Digest open"]}';
    return runSlackAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getSlackDigestAgent(): SlackDigestAgent {
  return SlackDigestAgent.instance;
}

export function resetSlackDigestAgentForTests(): void {
  SlackDigestAgent.reset();
}
