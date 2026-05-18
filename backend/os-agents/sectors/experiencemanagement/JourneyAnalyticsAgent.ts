import type { ILlmClient } from "../../LlmClient";
import type { ExperienceManagementInput, ExperienceManagementOutput } from "./shared";
import { getDefaultExperienceManagementLlm, runExperienceManagementAgentCore } from "./shared";

const AGENT_ID = "experiencemanagement-journeyanalytics";

export class JourneyAnalyticsAgent {
  private static inst: JourneyAnalyticsAgent | undefined;

  static get instance(): JourneyAnalyticsAgent {
    if (!JourneyAnalyticsAgent.inst) JourneyAnalyticsAgent.inst = new JourneyAnalyticsAgent();
    return JourneyAnalyticsAgent.inst;
  }

  static reset(): void {
    JourneyAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultExperienceManagementLlm();
  }

  async run(input: ExperienceManagementInput): Promise<ExperienceManagementOutput> {
    const eliteRole = "Eres **Journey Analytics** — mapa completo del customer journey.";
    const mission =
      "Mapea **journey completo**, **momentos críticos** y **drop-off points** en **<1 hora** tras signup.";
    const fewShot =
      '{"content":"Journey: mapa completo, momentos críticos, drop-off, <1 h signup","score":91,"highlights":["<1 h journey","Drop-off"],"metrics":["Journey map time"]}';
    return runExperienceManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getJourneyAnalyticsAgent(): JourneyAnalyticsAgent {
  return JourneyAnalyticsAgent.instance;
}

export function resetJourneyAnalyticsAgentForTests(): void {
  JourneyAnalyticsAgent.reset();
}
