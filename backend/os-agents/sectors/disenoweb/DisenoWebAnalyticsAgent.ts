import type { ILlmClient } from "../../LlmClient";
import type { DisenoWebInput, DisenoWebOutput } from "./shared";
import { getDefaultDisenoWebLlm, runDisenoWebAgentCore } from "./shared";

const AGENT_ID = "disenoweb-disenowebanalytics";

export class DisenoWebAnalyticsAgent {
  private static inst: DisenoWebAnalyticsAgent | undefined;

  static get instance(): DisenoWebAnalyticsAgent {
    if (!DisenoWebAnalyticsAgent.inst) DisenoWebAnalyticsAgent.inst = new DisenoWebAnalyticsAgent();
    return DisenoWebAnalyticsAgent.inst;
  }

  static reset(): void {
    DisenoWebAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDisenoWebLlm();
  }

  async run(input: DisenoWebInput): Promise<DisenoWebOutput> {
    const eliteRole = "Eres **Diseño Web Analytics** — conversión y mejoras.";
    const mission =
      "Configura **tracking de conversión**, **heatmaps y user flows** con **mejoras continuas**.";
    const fewShot =
      '{"content":"Analytics: conversión, heatmaps, flows, mejoras","score":92,"highlights":["User flows","Heatmaps"],"metrics":["Conversion tracking"]}';
    return runDisenoWebAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDisenoWebAnalyticsAgent(): DisenoWebAnalyticsAgent {
  return DisenoWebAnalyticsAgent.instance;
}

export function resetDisenoWebAnalyticsAgentForTests(): void {
  DisenoWebAnalyticsAgent.reset();
}
