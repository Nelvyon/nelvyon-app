import type { ILlmClient } from "../../LlmClient";
import type { MultiIdiomaAutomaticoInput, MultiIdiomaAutomaticoOutput } from "./shared";
import { getDefaultMultiIdiomaAutomaticoLlm, runMultiIdiomaAutomaticoAgentCore } from "./shared";

const AGENT_ID = "multiidiomaautomatico-analytics";

export class MultiIdiomaAnalyticsAgent {
  private static inst: MultiIdiomaAnalyticsAgent | undefined;

  static get instance(): MultiIdiomaAnalyticsAgent {
    if (!MultiIdiomaAnalyticsAgent.inst) MultiIdiomaAnalyticsAgent.inst = new MultiIdiomaAnalyticsAgent();
    return MultiIdiomaAnalyticsAgent.inst;
  }

  static reset(): void {
    MultiIdiomaAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultiIdiomaAutomaticoLlm();
  }

  async run(input: MultiIdiomaAutomaticoInput): Promise<MultiIdiomaAutomaticoOutput> {
    const eliteRole = "Eres **MultiIdioma Analytics** — analytics por idioma y región.";
    const mission =
      "Mide **conversión**, **engagement** y **revenue** por idioma y mercado; prioriza expansión internacional.";
    const fewShot =
      '{"content":"Analytics i18n: conversión, engagement, revenue por idioma/región","score":94,"highlights":["Por mercado","Revenue"],"metrics":["Locale conversion"]}';
    return runMultiIdiomaAutomaticoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getMultiIdiomaAnalyticsAgent(): MultiIdiomaAnalyticsAgent {
  return MultiIdiomaAnalyticsAgent.instance;
}

export function resetMultiIdiomaAnalyticsAgentForTests(): void {
  MultiIdiomaAnalyticsAgent.reset();
}
