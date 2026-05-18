import type { ILlmClient } from "../../LlmClient";
import type { AppBuilderWhiteLabelInput, AppBuilderWhiteLabelOutput } from "./shared";
import { getDefaultAppBuilderWhiteLabelLlm, runAppBuilderWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "appbuilderwhitelabel-analytics";

export class AppBuilderWhiteLabelAnalyticsAgent {
  private static inst: AppBuilderWhiteLabelAnalyticsAgent | undefined;

  static get instance(): AppBuilderWhiteLabelAnalyticsAgent {
    if (!AppBuilderWhiteLabelAnalyticsAgent.inst)
      AppBuilderWhiteLabelAnalyticsAgent.inst = new AppBuilderWhiteLabelAnalyticsAgent();
    return AppBuilderWhiteLabelAnalyticsAgent.inst;
  }

  static reset(): void {
    AppBuilderWhiteLabelAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAppBuilderWhiteLabelLlm();
  }

  async run(input: AppBuilderWhiteLabelInput): Promise<AppBuilderWhiteLabelOutput> {
    const eliteRole = "Eres **AppBuilderWhiteLabel Analytics** — analytics in-app y crecimiento.";
    const mission =
      "Mide **DAU**, **MAU**, **retención**, **funnel in-app** y **revenue** con KPIs accionables.";
    const fewShot =
      '{"content":"Analytics: DAU, MAU, retención, funnel, revenue","score":89,"highlights":["DAU/MAU","Funnel"],"metrics":["Retention D7"]}';
    return runAppBuilderWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getAppBuilderWhiteLabelAnalyticsAgent(): AppBuilderWhiteLabelAnalyticsAgent {
  return AppBuilderWhiteLabelAnalyticsAgent.instance;
}

export function resetAppBuilderWhiteLabelAnalyticsAgentForTests(): void {
  AppBuilderWhiteLabelAnalyticsAgent.reset();
}
