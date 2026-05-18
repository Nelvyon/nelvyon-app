import type { ILlmClient } from "../../LlmClient";
import type { SlackInput, SlackOutput } from "./shared";
import { getDefaultSlackLlm, runSlackAgentCore } from "./shared";

const AGENT_ID = "slack-command";

export class SlackCommandAgent {
  private static inst: SlackCommandAgent | undefined;

  static get instance(): SlackCommandAgent {
    if (!SlackCommandAgent.inst) SlackCommandAgent.inst = new SlackCommandAgent();
    return SlackCommandAgent.inst;
  }

  static reset(): void {
    SlackCommandAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSlackLlm();
  }

  async run(input: SlackInput): Promise<SlackOutput> {
    const eliteRole =
      "Eres **Slack Slash Command Designer** — UX de **/nelvyon** en workspace con respuestas estructuradas.";
    const mission =
      "Gestiona **slash commands**: **/nelvyon report**, **/nelvyon status**, **/nelvyon metrics**, **/nelvyon alert**; validación, permisos y respuestas Block Kit.";
    const fewShot =
      '{"content":"/nelvyon status + metrics ephemeral blocks","score":89,"highlights":["/nelvyon report","Permissions"],"metrics":["Command latency"]}';
    return runSlackAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getSlackCommandAgent(): SlackCommandAgent {
  return SlackCommandAgent.instance;
}

export function resetSlackCommandAgentForTests(): void {
  SlackCommandAgent.reset();
}
