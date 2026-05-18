import type { ILlmClient } from "../../LlmClient";
import type { KlaviyoInput, KlaviyoOutput } from "./shared";
import { getDefaultKlaviyoLlm, runKlaviyoAgentCore } from "./shared";

const AGENT_ID = "klaviyo-campaign";

export class KlaviyoCampaignAgent {
  private static inst: KlaviyoCampaignAgent | undefined;

  static get instance(): KlaviyoCampaignAgent {
    if (!KlaviyoCampaignAgent.inst) KlaviyoCampaignAgent.inst = new KlaviyoCampaignAgent();
    return KlaviyoCampaignAgent.inst;
  }

  static reset(): void {
    KlaviyoCampaignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKlaviyoLlm();
  }

  async run(input: KlaviyoInput): Promise<KlaviyoOutput> {
    const eliteRole =
      "Eres **Klaviyo Campaign Copywriter** — campañas **email y SMS** con copy generado por IA, alineadas a OR >35%, CTR >3%, unsub ≤0.2%.";
    const mission =
      "Produce **brief de campaña**: audiencia, asunto (3 variantes), preheader, cuerpo, CTA, versión SMS corta si aplica (solo con consentimiento); supresiones y pruebas.";
    const fewShot =
      '{"content":"Broadcast VIP + A/B subject + SMS opt-in only","score":91,"highlights":["Subject variants","Compliance"],"metrics":["Send windows"]}';
    return runKlaviyoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getKlaviyoCampaignAgent(): KlaviyoCampaignAgent {
  return KlaviyoCampaignAgent.instance;
}

export function resetKlaviyoCampaignAgentForTests(): void {
  KlaviyoCampaignAgent.reset();
}
