import type { ILlmClient } from "../../LlmClient";
import type { PublicApiInput, PublicApiOutput } from "./shared";
import { getDefaultPublicApiLlm, runPublicApiAgentCore } from "./shared";

const AGENT_ID = "publicapi-webhook-dispatch";

export class PublicApiWebhookDispatchAgent {
  private static inst: PublicApiWebhookDispatchAgent | undefined;

  static get instance(): PublicApiWebhookDispatchAgent {
    if (!PublicApiWebhookDispatchAgent.inst) PublicApiWebhookDispatchAgent.inst = new PublicApiWebhookDispatchAgent();
    return PublicApiWebhookDispatchAgent.inst;
  }

  static reset(): void {
    PublicApiWebhookDispatchAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPublicApiLlm();
  }

  async run(input: PublicApiInput): Promise<PublicApiOutput> {
    return runPublicApiAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Outbound worker; retry policy estricta.",
        mission:
          "Envía eventos webhook con **3 intentos** y backoff **1s, 5s, 25s**; tras fallo total marca suscripción **suspended**.",
        fewShotExample:
          '{"content":"Intento 3 falla → suspended=true.","score":92,"highlights":["Backoff","HMAC body"],"metrics":["DLQ opcional"]}',
      },
      input,
      0.2,
    );
  }
}

export function getPublicApiWebhookDispatchAgent(): PublicApiWebhookDispatchAgent {
  return PublicApiWebhookDispatchAgent.instance;
}

export function resetPublicApiWebhookDispatchAgentForTests(): void {
  PublicApiWebhookDispatchAgent.reset();
}
