import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLandingPageInput, SuperiorLandingPageOutput } from "./shared";
import { getDefaultSuperiorLandingPageLlm, runSuperiorLandingPageAgentCore } from "./shared";

const AGENT_ID = "superiorlandingpage-analytics";

export class SuperiorLandingPageAnalyticsAgent {
  private static inst: SuperiorLandingPageAnalyticsAgent | undefined;

  static get instance(): SuperiorLandingPageAnalyticsAgent {
    if (!SuperiorLandingPageAnalyticsAgent.inst) SuperiorLandingPageAnalyticsAgent.inst = new SuperiorLandingPageAnalyticsAgent();
    return SuperiorLandingPageAnalyticsAgent.inst;
  }

  static reset(): void {
    SuperiorLandingPageAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLandingPageLlm();
  }

  async run(input: SuperiorLandingPageInput): Promise<SuperiorLandingPageOutput> {
    const eliteRole = "Eres **SuperiorLandingPage Analytics** — tracking y comportamiento.";
    const mission =
      "Configura **tracking de conversiones**, heatmap virtual, scroll depth y análisis de bounce.";
    const fewShot =
      '{"content":"Conversion tracking virtual heatmap scroll depth bounce analysis","score":90,"highlights":["Conversion tracking","Scroll depth"],"metrics":["Analytics coverage"]}';
    return runSuperiorLandingPageAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorLandingPageAnalyticsAgent(): SuperiorLandingPageAnalyticsAgent {
  return SuperiorLandingPageAnalyticsAgent.instance;
}

export function resetSuperiorLandingPageAnalyticsAgentForTests(): void {
  SuperiorLandingPageAnalyticsAgent.reset();
}
