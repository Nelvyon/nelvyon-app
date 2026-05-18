import type { ILlmClient } from "../../LlmClient";
import type { SlackInput, SlackOutput } from "./shared";
import { getDefaultSlackLlm, runSlackAgentCore } from "./shared";

const AGENT_ID = "slack-analytics";

export class SlackAnalyticsAgent {
  private static inst: SlackAnalyticsAgent | undefined;

  static get instance(): SlackAnalyticsAgent {
    if (!SlackAnalyticsAgent.inst) SlackAnalyticsAgent.inst = new SlackAnalyticsAgent();
    return SlackAnalyticsAgent.inst;
  }

  static reset(): void {
    SlackAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSlackLlm();
  }

  async run(input: SlackInput): Promise<SlackOutput> {
    const eliteRole =
      "Eres **Slack Engagement Analyst** — volumen, interacción y resolución de alertas en workspace.";
    const mission =
      "Informe **métricas Slack**: **mensajes enviados**, **engagement**, **alertas resueltas**; desglose por canal y comando /nelvyon.";
    const fewShot =
      '{"content":"Msgs sent 420 engagement 38% alerts resolved 12","score":93,"highlights":["Engagement","Alerts resolved"],"metrics":["Messages sent"]}';
    return runSlackAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSlackAnalyticsAgent(): SlackAnalyticsAgent {
  return SlackAnalyticsAgent.instance;
}

export function resetSlackAnalyticsAgentForTests(): void {
  SlackAnalyticsAgent.reset();
}
