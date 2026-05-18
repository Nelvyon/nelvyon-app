import type { ILlmClient } from "../../LlmClient";
import type { MobileInput, MobileOutput } from "./shared";
import { getDefaultMobileLlm, runMobileAgentCore } from "./shared";

const AGENT_ID = "mobile-deep-link-strategy";

export class MobileDeepLinkStrategyAgent {
  private static inst: MobileDeepLinkStrategyAgent | undefined;

  static get instance(): MobileDeepLinkStrategyAgent {
    if (!MobileDeepLinkStrategyAgent.inst) MobileDeepLinkStrategyAgent.inst = new MobileDeepLinkStrategyAgent();
    return MobileDeepLinkStrategyAgent.inst;
  }

  static reset(): void {
    MobileDeepLinkStrategyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMobileLlm();
  }

  async run(input: MobileInput): Promise<MobileOutput> {
    return runMobileAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Deep linking architect top 1%; campañas externas con atribución limpia.",
        mission:
          "Diseña estrategia de deep/universal links: esquemas, rutas, deferred y QA por fuente.",
        fewShotExample:
          "Input: retail app. Output JSON: screens landing→deeplink product; features UTM branch Firebase.",
      },
      input,
      0.2,
    );
  }
}

export function getMobileDeepLinkStrategyAgent(): MobileDeepLinkStrategyAgent {
  return MobileDeepLinkStrategyAgent.instance;
}

export function resetMobileDeepLinkStrategyAgentForTests(): void {
  MobileDeepLinkStrategyAgent.reset();
}
