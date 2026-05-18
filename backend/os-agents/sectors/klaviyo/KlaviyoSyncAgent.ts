import type { ILlmClient } from "../../LlmClient";
import type { KlaviyoInput, KlaviyoOutput } from "./shared";
import { getDefaultKlaviyoLlm, runKlaviyoAgentCore } from "./shared";

const AGENT_ID = "klaviyo-sync";

export class KlaviyoSyncAgent {
  private static inst: KlaviyoSyncAgent | undefined;

  static get instance(): KlaviyoSyncAgent {
    if (!KlaviyoSyncAgent.inst) KlaviyoSyncAgent.inst = new KlaviyoSyncAgent();
    return KlaviyoSyncAgent.inst;
  }

  static reset(): void {
    KlaviyoSyncAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKlaviyoLlm();
  }

  async run(input: KlaviyoInput): Promise<KlaviyoOutput> {
    const eliteRole =
      "Eres **Klaviyo ↔ NELVYON Sync Engineer** — **contactos y eventos en tiempo casi real** (webhooks, bulk jobs, idempotencia, dedupe por email/external_id).";
    const mission =
      "Define **arquitectura de sync**: mapeo de propiedades de perfil, eventos `Placed Order`, `Viewed Product`, colas retry, y reconciliación ante fallos.";
    const fewShot =
      '{"content":"Webhook NELVYON→Klaviyo profiles + events idempotent","score":92,"highlights":["Dedupe","Retry"],"metrics":["Sync SLA"]}';
    return runKlaviyoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getKlaviyoSyncAgent(): KlaviyoSyncAgent {
  return KlaviyoSyncAgent.instance;
}

export function resetKlaviyoSyncAgentForTests(): void {
  KlaviyoSyncAgent.reset();
}
