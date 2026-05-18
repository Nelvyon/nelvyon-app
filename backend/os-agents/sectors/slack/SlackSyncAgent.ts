import type { ILlmClient } from "../../LlmClient";
import type { SlackInput, SlackOutput } from "./shared";
import { getDefaultSlackLlm, runSlackAgentCore } from "./shared";

const AGENT_ID = "slack-sync";

export class SlackSyncAgent {
  private static inst: SlackSyncAgent | undefined;

  static get instance(): SlackSyncAgent {
    if (!SlackSyncAgent.inst) SlackSyncAgent.inst = new SlackSyncAgent();
    return SlackSyncAgent.inst;
  }

  static reset(): void {
    SlackSyncAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSlackLlm();
  }

  async run(input: SlackInput): Promise<SlackOutput> {
    const eliteRole =
      "Eres **Slack CRM Sync Engineer** — hilos y contexto de cuenta en CRM NELVYON.";
    const mission =
      "Sincroniza **conversaciones Slack** con **CRM NELVYON**: mapeo canal↔cuenta, hilos, menciones y resolución de conflictos idempotente.";
    const fewShot =
      '{"content":"Thread sync to CRM account timeline idempotent","score":91,"highlights":["CRM mapping","Thread context"],"metrics":["Sync lag"]}';
    return runSlackAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSlackSyncAgent(): SlackSyncAgent {
  return SlackSyncAgent.instance;
}

export function resetSlackSyncAgentForTests(): void {
  SlackSyncAgent.reset();
}
