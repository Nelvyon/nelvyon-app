import type { ILlmClient } from "../../LlmClient";
import type { AppBuilderWhiteLabelInput, AppBuilderWhiteLabelOutput } from "./shared";
import { getDefaultAppBuilderWhiteLabelLlm, runAppBuilderWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "appbuilderwhitelabel-update";

export class AppBuilderWhiteLabelUpdateAgent {
  private static inst: AppBuilderWhiteLabelUpdateAgent | undefined;

  static get instance(): AppBuilderWhiteLabelUpdateAgent {
    if (!AppBuilderWhiteLabelUpdateAgent.inst) AppBuilderWhiteLabelUpdateAgent.inst = new AppBuilderWhiteLabelUpdateAgent();
    return AppBuilderWhiteLabelUpdateAgent.inst;
  }

  static reset(): void {
    AppBuilderWhiteLabelUpdateAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAppBuilderWhiteLabelLlm();
  }

  async run(input: AppBuilderWhiteLabelInput): Promise<AppBuilderWhiteLabelOutput> {
    const eliteRole = "Eres **AppBuilderWhiteLabel Update** — actualizaciones OTA sin stores.";
    const mission =
      "Despliega **OTA automáticas** sin pasar por stores, con **rollback instantáneo** y **cero downtime**.";
    const fewShot =
      '{"content":"Update: OTA sin stores, rollback instantáneo, sin downtime","score":88,"highlights":["OTA","Rollback"],"metrics":["Deploy downtime"]}';
    return runAppBuilderWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getAppBuilderWhiteLabelUpdateAgent(): AppBuilderWhiteLabelUpdateAgent {
  return AppBuilderWhiteLabelUpdateAgent.instance;
}

export function resetAppBuilderWhiteLabelUpdateAgentForTests(): void {
  AppBuilderWhiteLabelUpdateAgent.reset();
}
