import type { ILlmClient } from "../../LlmClient";
import type { SlackInput, SlackOutput } from "./shared";
import { getDefaultSlackLlm, runSlackAgentCore } from "./shared";

const AGENT_ID = "slack-alert";

export class SlackAlertAgent {
  private static inst: SlackAlertAgent | undefined;

  static get instance(): SlackAlertAgent {
    if (!SlackAlertAgent.inst) SlackAlertAgent.inst = new SlackAlertAgent();
    return SlackAlertAgent.inst;
  }

  static reset(): void {
    SlackAlertAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSlackLlm();
  }

  async run(input: SlackInput): Promise<SlackOutput> {
    const eliteRole =
      "Eres **Slack Critical Alert Engineer** — severidad, escalado y ack de incidentes operativos.";
    const mission =
      "Define **alertas críticas**: **churn detectado**, **billing fallido**, **SLA breach**; umbrales, canales on-call y botones ack en Block Kit.";
    const fewShot =
      '{"content":"P1 SLA breach → #incidents with ack button","score":92,"highlights":["Churn alert","SLA breach"],"metrics":["MTTR"]}';
    return runSlackAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSlackAlertAgent(): SlackAlertAgent {
  return SlackAlertAgent.instance;
}

export function resetSlackAlertAgentForTests(): void {
  SlackAlertAgent.reset();
}
