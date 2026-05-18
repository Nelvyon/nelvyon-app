import type { ILlmClient } from "../../LlmClient";
import type { MobileInput, MobileOutput } from "./shared";
import { getDefaultMobileLlm, runMobileAgentCore } from "./shared";

const AGENT_ID = "mobile-in-app-messaging";

export class MobileInAppMessagingAgent {
  private static inst: MobileInAppMessagingAgent | undefined;

  static get instance(): MobileInAppMessagingAgent {
    if (!MobileInAppMessagingAgent.inst) MobileInAppMessagingAgent.inst = new MobileInAppMessagingAgent();
    return MobileInAppMessagingAgent.inst;
  }

  static reset(): void {
    MobileInAppMessagingAgent.inst = undefined;
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
          "ROLE: In-app messaging copy chief top 1%; upsell honesto y útil.",
        mission:
          "Genera mensajes in-app para upsell, nuevas features y NPS con variantes y triggers.",
        fewShotExample:
          "Input: freemium fitness. Output JSON: screens modal sheet tooltip; features paywall soft NPS post-workout.",
      },
      input,
      0.5,
    );
  }
}

export function getMobileInAppMessagingAgent(): MobileInAppMessagingAgent {
  return MobileInAppMessagingAgent.instance;
}

export function resetMobileInAppMessagingAgentForTests(): void {
  MobileInAppMessagingAgent.reset();
}
