import type { ILlmClient } from "../../LlmClient";
import type { ZapierInput, ZapierOutput } from "./shared";
import { getDefaultZapierLlm, runZapierAgentCore } from "./shared";

const AGENT_ID = "zapier-webhook";

export class ZapierWebhookAgent {
  private static inst: ZapierWebhookAgent | undefined;

  static get instance(): ZapierWebhookAgent {
    if (!ZapierWebhookAgent.inst) ZapierWebhookAgent.inst = new ZapierWebhookAgent();
    return ZapierWebhookAgent.inst;
  }

  static reset(): void {
    ZapierWebhookAgent.inst = undefined;
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
        eliteRole: "ROLE: Ingest endpoint; compatible Catch Hook Zapier y Make webhooks.",
        mission:
          "Recibe **webhooks entrantes** de Zapier/Make: verificación firma, normalización JSON, encolado de acciones.",
        fewShotExample:
          '{"content":"POST Make router module → parse body → action queue.","score":92,"highlights":["Signature","Replay guard"],"metrics":["202 accepted"]}',
      },
      input,
      0.1,
    );
  }
}

export function getZapierWebhookAgent(): ZapierWebhookAgent {
  return ZapierWebhookAgent.instance;
}

export function resetZapierWebhookAgentForTests(): void {
  ZapierWebhookAgent.reset();
}
