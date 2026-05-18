import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSeoInput, SuperiorSeoOutput } from "./shared";
import { getDefaultSuperiorSeoLlm, runSuperiorSeoAgentCore } from "./shared";

const AGENT_ID = "superiorseo-analytics";

export class SuperiorSeoAnalyticsAgent {
  private static inst: SuperiorSeoAnalyticsAgent | undefined;

  static get instance(): SuperiorSeoAnalyticsAgent {
    if (!SuperiorSeoAnalyticsAgent.inst) SuperiorSeoAnalyticsAgent.inst = new SuperiorSeoAnalyticsAgent();
    return SuperiorSeoAnalyticsAgent.inst;
  }

  static reset(): void {
    SuperiorSeoAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSeoLlm();
  }

  async run(input: SuperiorSeoInput): Promise<SuperiorSeoOutput> {
    const eliteRole = "Eres **SuperiorSeo Analytics Lead** — rankings, GSC y ROI.";
    const mission =
      "Trackea **posiciones**, **CTR orgánico >8%**, impresiones **GSC**, **ROI SEO** e informes **diarios** automatizados.";
    const fewShot =
      '{"content":"Daily rank report, CTR 8.4%, GSC impressions, SEO ROI","score":90,"highlights":[">8% CTR","Daily report"],"metrics":["Organic CTR"]}';
    return runSuperiorSeoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorSeoAnalyticsAgent(): SuperiorSeoAnalyticsAgent {
  return SuperiorSeoAnalyticsAgent.instance;
}

export function resetSuperiorSeoAnalyticsAgentForTests(): void {
  SuperiorSeoAnalyticsAgent.reset();
}
