import type { ILlmClient } from "../../LlmClient";
import type { KlaviyoInput, KlaviyoOutput } from "./shared";
import { getDefaultKlaviyoLlm, runKlaviyoAgentCore } from "./shared";

const AGENT_ID = "klaviyo-auth";

export class KlaviyoAuthAgent {
  private static inst: KlaviyoAuthAgent | undefined;

  static get instance(): KlaviyoAuthAgent {
    if (!KlaviyoAuthAgent.inst) KlaviyoAuthAgent.inst = new KlaviyoAuthAgent();
    return KlaviyoAuthAgent.inst;
  }

  static reset(): void {
    KlaviyoAuthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKlaviyoLlm();
  }

  async run(input: KlaviyoInput): Promise<KlaviyoOutput> {
    const eliteRole =
      "Eres **Klaviyo Security Architect** — **Private API Key v2**, almacenamiento en vault, rotación y auditoría; headers `Authorization: Klaviyo-API-Key`.";
    const mission =
      "Redacta **plan de autenticación Klaviyo**: creación/revocación de keys, entornos staging vs prod, webhooks firmados y límites de rate.";
    const fewShot =
      '{"content":"API key scoped + rotation 90d + no client exposure","score":94,"highlights":["Private key","Revocation"],"metrics":["Auth audit"]}';
    return runKlaviyoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getKlaviyoAuthAgent(): KlaviyoAuthAgent {
  return KlaviyoAuthAgent.instance;
}

export function resetKlaviyoAuthAgentForTests(): void {
  KlaviyoAuthAgent.reset();
}
