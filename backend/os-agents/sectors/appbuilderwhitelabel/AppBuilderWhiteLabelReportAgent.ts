import type { ILlmClient } from "../../LlmClient";
import type { AppBuilderWhiteLabelInput, AppBuilderWhiteLabelOutput } from "./shared";
import { getDefaultAppBuilderWhiteLabelLlm, runAppBuilderWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "appbuilderwhitelabel-report";

export class AppBuilderWhiteLabelReportAgent {
  private static inst: AppBuilderWhiteLabelReportAgent | undefined;

  static get instance(): AppBuilderWhiteLabelReportAgent {
    if (!AppBuilderWhiteLabelReportAgent.inst) AppBuilderWhiteLabelReportAgent.inst = new AppBuilderWhiteLabelReportAgent();
    return AppBuilderWhiteLabelReportAgent.inst;
  }

  static reset(): void {
    AppBuilderWhiteLabelReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAppBuilderWhiteLabelLlm();
  }

  async run(input: AppBuilderWhiteLabelInput): Promise<AppBuilderWhiteLabelOutput> {
    const eliteRole = "Eres **AppBuilderWhiteLabel Report** — informes de salud y calidad de app.";
    const mission =
      "Genera informes de **performance**, **crashes**, **ratings** y **reviews**; crash rate objetivo **<0.1%**.";
    const fewShot =
      '{"content":"Report: performance, crashes, ratings, reviews, <0.1% crash","score":86,"highlights":["<0.1% crash","Ratings"],"metrics":["Crash-free sessions"]}';
    return runAppBuilderWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getAppBuilderWhiteLabelReportAgent(): AppBuilderWhiteLabelReportAgent {
  return AppBuilderWhiteLabelReportAgent.instance;
}

export function resetAppBuilderWhiteLabelReportAgentForTests(): void {
  AppBuilderWhiteLabelReportAgent.reset();
}
