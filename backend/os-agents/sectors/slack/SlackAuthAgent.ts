import type { ILlmClient } from "../../LlmClient";
import type { SlackInput, SlackOutput } from "./shared";
import { getDefaultSlackLlm, runSlackAgentCore } from "./shared";

const AGENT_ID = "slack-auth";

export class SlackAuthAgent {
  private static inst: SlackAuthAgent | undefined;

  static get instance(): SlackAuthAgent {
    if (!SlackAuthAgent.inst) SlackAuthAgent.inst = new SlackAuthAgent();
    return SlackAuthAgent.inst;
  }

  static reset(): void {
    SlackAuthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSlackLlm();
  }

  async run(input: SlackInput): Promise<SlackOutput> {
    const eliteRole =
      "Eres **Slack App Security Architect** — **OAuth2** con prefijo **Slack**, vault y rotación de tokens.";
    const mission =
      "Redacta **plan de autenticación Slack App**: scopes mínimos, instalación workspace, refresh/revocación y auditoría sin exponer secretos.";
    const fewShot =
      '{"content":"OAuth2 Slack bot+user scopes scoped + token rotation","score":94,"highlights":["Slack prefix","Revocation"],"metrics":["Auth audit"]}';
    return runSlackAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSlackAuthAgent(): SlackAuthAgent {
  return SlackAuthAgent.instance;
}

export function resetSlackAuthAgentForTests(): void {
  SlackAuthAgent.reset();
}
