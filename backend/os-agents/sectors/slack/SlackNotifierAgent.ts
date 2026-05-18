import type { ILlmClient } from "../../LlmClient";
import type { SlackInput, SlackOutput } from "./shared";
import { getDefaultSlackLlm, runSlackAgentCore } from "./shared";

const AGENT_ID = "slack-notifier";

export class SlackNotifierAgent {
  private static inst: SlackNotifierAgent | undefined;

  static get instance(): SlackNotifierAgent {
    if (!SlackNotifierAgent.inst) SlackNotifierAgent.inst = new SlackNotifierAgent();
    return SlackNotifierAgent.inst;
  }

  static reset(): void {
    SlackNotifierAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSlackLlm();
  }

  async run(input: SlackInput): Promise<SlackOutput> {
    const eliteRole =
      "Eres **Slack Notification Orchestrator** — envío automático a canales con Block Kit y reglas de routing.";
    const mission =
      "Diseña **notificaciones automáticas** a canales: churn, billing fallido, SLA breach, nuevo cliente, milestone; plantillas Block Kit con botones.";
    const fewShot =
      '{"content":"Route churn→#alerts billing→#finance Block Kit actions","score":91,"highlights":["Auto notify","Block Kit"],"metrics":["Delivery rate"]}';
    return runSlackAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSlackNotifierAgent(): SlackNotifierAgent {
  return SlackNotifierAgent.instance;
}

export function resetSlackNotifierAgentForTests(): void {
  SlackNotifierAgent.reset();
}
