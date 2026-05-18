import type { ILlmClient } from "../../LlmClient";
import type { ZapierInput, ZapierOutput } from "./shared";
import { getDefaultZapierLlm, runZapierAgentCore } from "./shared";

const AGENT_ID = "zapier-trigger";

export class ZapierTriggerAgent {
  private static inst: ZapierTriggerAgent | undefined;

  static get instance(): ZapierTriggerAgent {
    if (!ZapierTriggerAgent.inst) ZapierTriggerAgent.inst = new ZapierTriggerAgent();
    return ZapierTriggerAgent.inst;
  }

  static reset(): void {
    ZapierTriggerAgent.inst = undefined;
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
        eliteRole: "ROLE: Outbound NAT publisher; REST hooks a Zapier/Make.",
        mission:
          "Define y dispara **triggers** hacia Zapier y Make: eventos agent.completed, client.created, billing.paid, report.generated, churn.detected, review.received; payload canónico JSON.",
        fewShotExample:
          '{"content":"Trigger billing.paid con invoice_id hacia Make scenario.","score":90,"highlights":["HMAC opcional","Idempotency key"],"metrics":["200 OK"]}',
      },
      input,
      0.4,
    );
  }
}

export function getZapierTriggerAgent(): ZapierTriggerAgent {
  return ZapierTriggerAgent.instance;
}

export function resetZapierTriggerAgentForTests(): void {
  ZapierTriggerAgent.reset();
}
