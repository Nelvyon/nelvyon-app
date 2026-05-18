import type { ILlmClient } from "../../LlmClient";
import type { PublicApiInput, PublicApiOutput } from "./shared";
import { getDefaultPublicApiLlm, runPublicApiAgentCore } from "./shared";

const AGENT_ID = "publicapi-webhook";

export class PublicApiWebhookAgent {
  private static inst: PublicApiWebhookAgent | undefined;

  static get instance(): PublicApiWebhookAgent {
    if (!PublicApiWebhookAgent.inst) PublicApiWebhookAgent.inst = new PublicApiWebhookAgent();
    return PublicApiWebhookAgent.inst;
  }

  static reset(): void {
    PublicApiWebhookAgent.inst = undefined;
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
        eliteRole: "ROLE: Subscription CRUD; tabla webhook_subscriptions.",
        mission:
          "Gestiona suscripciones webhooks: crear, pausar, eliminar; eventos agent.completed, agent.failed, client.created, client.churned, billing.paid, billing.failed; url + secret + activo.",
        fewShotExample:
          '{"content":"POST subscription billing.paid → URL firmada HMAC.","score":91,"highlights":["event filter","activo"],"metrics":["sub_id"]}',
      },
      input,
      0.2,
    );
  }
}

export function getPublicApiWebhookAgent(): PublicApiWebhookAgent {
  return PublicApiWebhookAgent.instance;
}

export function resetPublicApiWebhookAgentForTests(): void {
  PublicApiWebhookAgent.reset();
}
