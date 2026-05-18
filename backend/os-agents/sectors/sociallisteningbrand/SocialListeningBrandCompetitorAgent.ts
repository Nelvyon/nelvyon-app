import type { ILlmClient } from "../../LlmClient";
import type { SocialListeningBrandInput, SocialListeningBrandOutput } from "./shared";
import { getDefaultSocialListeningBrandLlm, runSocialListeningBrandAgentCore } from "./shared";

const AGENT_ID = "sociallisteningbrand-competitor";

export class SocialListeningBrandCompetitorAgent {
  private static inst: SocialListeningBrandCompetitorAgent | undefined;

  static get instance(): SocialListeningBrandCompetitorAgent {
    if (!SocialListeningBrandCompetitorAgent.inst)
      SocialListeningBrandCompetitorAgent.inst = new SocialListeningBrandCompetitorAgent();
    return SocialListeningBrandCompetitorAgent.inst;
  }

  static reset(): void {
    SocialListeningBrandCompetitorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialListeningBrandLlm();
  }

  async run(input: SocialListeningBrandInput): Promise<SocialListeningBrandOutput> {
    const eliteRole = "Eres **SocialListeningBrand Competitor** — inteligencia competitiva en escucha social.";
    const mission =
      "Monitorea **share of voice**, **sentiment comparado** y **campañas rivales**; SOV recalculado **cada hora**.";
    const fewShot =
      '{"content":"Competitor: SOV, sentiment comparado, campañas rivales, hourly SOV","score":91,"highlights":["SOV hourly","Rivales"],"metrics":["Share of voice"]}';
    return runSocialListeningBrandAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSocialListeningBrandCompetitorAgent(): SocialListeningBrandCompetitorAgent {
  return SocialListeningBrandCompetitorAgent.instance;
}

export function resetSocialListeningBrandCompetitorAgentForTests(): void {
  SocialListeningBrandCompetitorAgent.reset();
}
