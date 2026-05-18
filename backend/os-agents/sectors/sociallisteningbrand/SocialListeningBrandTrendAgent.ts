import type { ILlmClient } from "../../LlmClient";
import type { SocialListeningBrandInput, SocialListeningBrandOutput } from "./shared";
import { getDefaultSocialListeningBrandLlm, runSocialListeningBrandAgentCore } from "./shared";

const AGENT_ID = "sociallisteningbrand-trend";

export class SocialListeningBrandTrendAgent {
  private static inst: SocialListeningBrandTrendAgent | undefined;

  static get instance(): SocialListeningBrandTrendAgent {
    if (!SocialListeningBrandTrendAgent.inst) SocialListeningBrandTrendAgent.inst = new SocialListeningBrandTrendAgent();
    return SocialListeningBrandTrendAgent.inst;
  }

  static reset(): void {
    SocialListeningBrandTrendAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialListeningBrandLlm();
  }

  async run(input: SocialListeningBrandInput): Promise<SocialListeningBrandOutput> {
    const eliteRole = "Eres **SocialListeningBrand Trend** — detección de tendencias emergentes.";
    const mission =
      "Detecta **tendencias del sector** y **oportunidades de contenido viral**; trending topics con latencia **<1h**.";
    const fewShot =
      '{"content":"Trend: tendencias sector, viral content, <1h latencia","score":90,"highlights":["<1h topics","Viral"],"metrics":["Trend latency"]}';
    return runSocialListeningBrandAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSocialListeningBrandTrendAgent(): SocialListeningBrandTrendAgent {
  return SocialListeningBrandTrendAgent.instance;
}

export function resetSocialListeningBrandTrendAgentForTests(): void {
  SocialListeningBrandTrendAgent.reset();
}
