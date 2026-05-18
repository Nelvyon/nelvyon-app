import type { ILlmClient } from "../../LlmClient";
import type { SocialListeningBrandInput, SocialListeningBrandOutput } from "./shared";
import { getDefaultSocialListeningBrandLlm, runSocialListeningBrandAgentCore } from "./shared";

const AGENT_ID = "sociallisteningbrand-sentiment";

export class SocialListeningBrandSentimentAgent {
  private static inst: SocialListeningBrandSentimentAgent | undefined;

  static get instance(): SocialListeningBrandSentimentAgent {
    if (!SocialListeningBrandSentimentAgent.inst)
      SocialListeningBrandSentimentAgent.inst = new SocialListeningBrandSentimentAgent();
    return SocialListeningBrandSentimentAgent.inst;
  }

  static reset(): void {
    SocialListeningBrandSentimentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialListeningBrandLlm();
  }

  async run(input: SocialListeningBrandInput): Promise<SocialListeningBrandOutput> {
    const eliteRole = "Eres **SocialListeningBrand Sentiment** — análisis de sentimiento de menciones.";
    const mission =
      "Clasifica **positivo/negativo/neutro**, detecta **tendencia** y dispara **alertas de crisis**; accuracy **>92%**.";
    const fewShot =
      '{"content":"Sentiment: pos/neg/neutro, tendencia, alertas crisis, >92% accuracy","score":92,"highlights":[">92% accuracy","Tendencia"],"metrics":["Sentiment score"]}';
    return runSocialListeningBrandAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSocialListeningBrandSentimentAgent(): SocialListeningBrandSentimentAgent {
  return SocialListeningBrandSentimentAgent.instance;
}

export function resetSocialListeningBrandSentimentAgentForTests(): void {
  SocialListeningBrandSentimentAgent.reset();
}
