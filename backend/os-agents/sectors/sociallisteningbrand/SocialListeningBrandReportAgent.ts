import type { ILlmClient } from "../../LlmClient";
import type { SocialListeningBrandInput, SocialListeningBrandOutput } from "./shared";
import { getDefaultSocialListeningBrandLlm, runSocialListeningBrandAgentCore } from "./shared";

const AGENT_ID = "sociallisteningbrand-report";

export class SocialListeningBrandReportAgent {
  private static inst: SocialListeningBrandReportAgent | undefined;

  static get instance(): SocialListeningBrandReportAgent {
    if (!SocialListeningBrandReportAgent.inst) SocialListeningBrandReportAgent.inst = new SocialListeningBrandReportAgent();
    return SocialListeningBrandReportAgent.inst;
  }

  static reset(): void {
    SocialListeningBrandReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialListeningBrandLlm();
  }

  async run(input: SocialListeningBrandInput): Promise<SocialListeningBrandOutput> {
    const eliteRole = "Eres **SocialListeningBrand Report** — informes de brand intelligence.";
    const mission =
      "Genera informes con **SOV**, **sentiment score** y **trending topics** para decisiones ejecutivas.";
    const fewShot =
      '{"content":"Report: SOV, sentiment score, trending topics","score":86,"highlights":["SOV","Trending"],"metrics":["Sentiment score"]}';
    return runSocialListeningBrandAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSocialListeningBrandReportAgent(): SocialListeningBrandReportAgent {
  return SocialListeningBrandReportAgent.instance;
}

export function resetSocialListeningBrandReportAgentForTests(): void {
  SocialListeningBrandReportAgent.reset();
}
