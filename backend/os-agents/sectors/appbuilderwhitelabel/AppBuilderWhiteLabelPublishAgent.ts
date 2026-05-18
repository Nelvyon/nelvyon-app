import type { ILlmClient } from "../../LlmClient";
import type { AppBuilderWhiteLabelInput, AppBuilderWhiteLabelOutput } from "./shared";
import { getDefaultAppBuilderWhiteLabelLlm, runAppBuilderWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "appbuilderwhitelabel-publish";

export class AppBuilderWhiteLabelPublishAgent {
  private static inst: AppBuilderWhiteLabelPublishAgent | undefined;

  static get instance(): AppBuilderWhiteLabelPublishAgent {
    if (!AppBuilderWhiteLabelPublishAgent.inst) AppBuilderWhiteLabelPublishAgent.inst = new AppBuilderWhiteLabelPublishAgent();
    return AppBuilderWhiteLabelPublishAgent.inst;
  }

  static reset(): void {
    AppBuilderWhiteLabelPublishAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAppBuilderWhiteLabelLlm();
  }

  async run(input: AppBuilderWhiteLabelInput): Promise<AppBuilderWhiteLabelOutput> {
    const eliteRole = "Eres **AppBuilderWhiteLabel Publish** — publicación automática multi-canal.";
    const mission =
      "Publica en **App Store**, **Google Play**, **PWA** y **dominio propio**; stores en **<48h** y PWA **día 1**.";
    const fewShot =
      '{"content":"Publish: App Store, Google Play, PWA, dominio propio, <48h","score":91,"highlights":["<48h stores","PWA day 1"],"metrics":["Store approval time"]}';
    return runAppBuilderWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getAppBuilderWhiteLabelPublishAgent(): AppBuilderWhiteLabelPublishAgent {
  return AppBuilderWhiteLabelPublishAgent.instance;
}

export function resetAppBuilderWhiteLabelPublishAgentForTests(): void {
  AppBuilderWhiteLabelPublishAgent.reset();
}
