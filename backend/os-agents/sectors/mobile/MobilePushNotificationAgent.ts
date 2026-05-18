import type { ILlmClient } from "../../LlmClient";
import type { MobileInput, MobileOutput } from "./shared";
import { getDefaultMobileLlm, runMobileAgentCore } from "./shared";

const AGENT_ID = "mobile-push-notification";

export class MobilePushNotificationAgent {
  private static inst: MobilePushNotificationAgent | undefined;

  static get instance(): MobilePushNotificationAgent {
    if (!MobilePushNotificationAgent.inst) MobilePushNotificationAgent.inst = new MobilePushNotificationAgent();
    return MobilePushNotificationAgent.inst;
  }

  static reset(): void {
    MobilePushNotificationAgent.inst = undefined;
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
          "ROLE: Push strategist top 1%; secuencias por comportamiento sin spam.",
        mission:
          "Genera secuencias de push por triggers (inactividad, carrito, milestone) con copy y timing.",
        fewShotExample:
          "Input: ecommerce. Output JSON: screens N/A en lista pero pasos campaña D0-D7; features rich push A/B.",
      },
      input,
      0.5,
    );
  }
}

export function getMobilePushNotificationAgent(): MobilePushNotificationAgent {
  return MobilePushNotificationAgent.instance;
}

export function resetMobilePushNotificationAgentForTests(): void {
  MobilePushNotificationAgent.reset();
}
