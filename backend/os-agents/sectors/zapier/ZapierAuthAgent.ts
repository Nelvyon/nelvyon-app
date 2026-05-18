import type { ILlmClient } from "../../LlmClient";
import type { ZapierInput, ZapierOutput } from "./shared";
import { getDefaultZapierLlm, runZapierAgentCore } from "./shared";

const AGENT_ID = "zapier-auth";

export class ZapierAuthAgent {
  private static inst: ZapierAuthAgent | undefined;

  static get instance(): ZapierAuthAgent {
    if (!ZapierAuthAgent.inst) ZapierAuthAgent.inst = new ZapierAuthAgent();
    return ZapierAuthAgent.inst;
  }

  static reset(): void {
    ZapierAuthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultZapierLlm();
  }

  async run(input: ZapierInput): Promise<ZapierOutput> {
    return runZapierAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: OAuth2 + API keys; scopes mínimos por acción.",
        mission:
          "Gestiona **OAuth2** y **API keys** para conexión segura con Zapier/Make; refresh tokens, revocación y vínculo cuenta NELVYON.",
        fewShotExample:
          '{"content":"Authorization Code flow; scopes zapier.read zapier.write.","score":93,"highlights":["PKCE","Secret vault"],"metrics":["token_ttl"]}',
      },
      input,
      0.1,
    );
  }
}

export function getZapierAuthAgent(): ZapierAuthAgent {
  return ZapierAuthAgent.instance;
}

export function resetZapierAuthAgentForTests(): void {
  ZapierAuthAgent.reset();
}
