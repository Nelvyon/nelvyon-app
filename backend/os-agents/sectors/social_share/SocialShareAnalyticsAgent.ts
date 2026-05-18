import type { ILlmClient } from "../../LlmClient";
import type { SocialShareInput, SocialShareOutput } from "./shared";
import { getDefaultSocialShareLlm, runSocialShareAgentCore } from "./shared";

const AGENT_ID = "social-share-analytics";

export class SocialShareAnalyticsAgent {
  private static inst: SocialShareAnalyticsAgent | undefined;

  static get instance(): SocialShareAnalyticsAgent {
    if (!SocialShareAnalyticsAgent.inst) SocialShareAnalyticsAgent.inst = new SocialShareAnalyticsAgent();
    return SocialShareAnalyticsAgent.inst;
  }

  static reset(): void {
    SocialShareAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialShareLlm();
  }

  async run(input: SocialShareInput): Promise<SocialShareOutput> {
    return runSocialShareAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Growth analyst top 1%; cohortes sin vanity metrics.",
        mission:
          "Métricas: k-factor por red, shares/cliente, viral coefficient; solo hipótesis si hay datos en brief.",
        fewShotExample:
          '{"content":"Panel semanal: k por LinkedIn vs X; shares/usuario activo.","score":91,"highlights":["Definición k acotada","Exclusión bots"],"metrics":["Coef viral rolling 7d","Share depth"]}',
      },
      input,
      0.1,
    );
  }
}

export function getSocialShareAnalyticsAgent(): SocialShareAnalyticsAgent {
  return SocialShareAnalyticsAgent.instance;
}

export function resetSocialShareAnalyticsAgentForTests(): void {
  SocialShareAnalyticsAgent.reset();
}
