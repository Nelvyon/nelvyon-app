import type { ILlmClient } from "../../LlmClient";
import type { AppBuilderWhiteLabelInput, AppBuilderWhiteLabelOutput } from "./shared";
import { getDefaultAppBuilderWhiteLabelLlm, runAppBuilderWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "appbuilderwhitelabel-monetization";

export class AppBuilderWhiteLabelMonetizationAgent {
  private static inst: AppBuilderWhiteLabelMonetizationAgent | undefined;

  static get instance(): AppBuilderWhiteLabelMonetizationAgent {
    if (!AppBuilderWhiteLabelMonetizationAgent.inst)
      AppBuilderWhiteLabelMonetizationAgent.inst = new AppBuilderWhiteLabelMonetizationAgent();
    return AppBuilderWhiteLabelMonetizationAgent.inst;
  }

  static reset(): void {
    AppBuilderWhiteLabelMonetizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAppBuilderWhiteLabelLlm();
  }

  async run(input: AppBuilderWhiteLabelInput): Promise<AppBuilderWhiteLabelOutput> {
    const eliteRole = "Eres **AppBuilderWhiteLabel Monetization** — monetización in-app con Paddle.";
    const mission =
      "Configura **in-app purchases**, **suscripciones**, **ads** y **freemium** con Paddle y reporting de revenue.";
    const fewShot =
      '{"content":"Monetization: IAP, suscripciones, ads, freemium Paddle","score":87,"highlights":["Paddle","Freemium"],"metrics":["ARPU"]}';
    return runAppBuilderWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getAppBuilderWhiteLabelMonetizationAgent(): AppBuilderWhiteLabelMonetizationAgent {
  return AppBuilderWhiteLabelMonetizationAgent.instance;
}

export function resetAppBuilderWhiteLabelMonetizationAgentForTests(): void {
  AppBuilderWhiteLabelMonetizationAgent.reset();
}
