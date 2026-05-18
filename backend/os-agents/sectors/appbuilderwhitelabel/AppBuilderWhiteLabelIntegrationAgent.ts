import type { ILlmClient } from "../../LlmClient";
import type { AppBuilderWhiteLabelInput, AppBuilderWhiteLabelOutput } from "./shared";
import { getDefaultAppBuilderWhiteLabelLlm, runAppBuilderWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "appbuilderwhitelabel-integration";

export class AppBuilderWhiteLabelIntegrationAgent {
  private static inst: AppBuilderWhiteLabelIntegrationAgent | undefined;

  static get instance(): AppBuilderWhiteLabelIntegrationAgent {
    if (!AppBuilderWhiteLabelIntegrationAgent.inst)
      AppBuilderWhiteLabelIntegrationAgent.inst = new AppBuilderWhiteLabelIntegrationAgent();
    return AppBuilderWhiteLabelIntegrationAgent.inst;
  }

  static reset(): void {
    AppBuilderWhiteLabelIntegrationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAppBuilderWhiteLabelLlm();
  }

  async run(input: AppBuilderWhiteLabelInput): Promise<AppBuilderWhiteLabelOutput> {
    const eliteRole = "Eres **AppBuilderWhiteLabel Integration** — integraciones de app white-label.";
    const mission =
      "Conecta **APIs externas**, **pagos**, **push notifications** y **analytics** con configuración guiada.";
    const fewShot =
      '{"content":"Integration: APIs, pagos, push, analytics","score":90,"highlights":["APIs","Push"],"metrics":["Integration coverage"]}';
    return runAppBuilderWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getAppBuilderWhiteLabelIntegrationAgent(): AppBuilderWhiteLabelIntegrationAgent {
  return AppBuilderWhiteLabelIntegrationAgent.instance;
}

export function resetAppBuilderWhiteLabelIntegrationAgentForTests(): void {
  AppBuilderWhiteLabelIntegrationAgent.reset();
}
