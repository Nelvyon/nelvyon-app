import type { ILlmClient } from "../../LlmClient";
import type { KlaviyoInput, KlaviyoOutput } from "./shared";
import { getDefaultKlaviyoLlm, runKlaviyoAgentCore } from "./shared";

const AGENT_ID = "klaviyo-flow";

export class KlaviyoFlowAgent {
  private static inst: KlaviyoFlowAgent | undefined;

  static get instance(): KlaviyoFlowAgent {
    if (!KlaviyoFlowAgent.inst) KlaviyoFlowAgent.inst = new KlaviyoFlowAgent();
    return KlaviyoFlowAgent.inst;
  }

  static reset(): void {
    KlaviyoFlowAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKlaviyoLlm();
  }

  async run(input: KlaviyoInput): Promise<KlaviyoOutput> {
    const eliteRole =
      "Eres **Klaviyo Flow Architect** — automatizaciones **welcome, abandoned cart, winback, post-purchase, browse abandonment** con triggers y splits.";
    const mission =
      "Genera **blueprint de flows**: Welcome (3 emails); Cart 1h/24h/72h; Winback D30/D60; Post-purchase D7 review+upsell; Browse 1h; **SMS solo urgencia** con opt-in.";
    const fewShot =
      '{"content":"Cart 3-step + SMS branch if opted-in","score":93,"highlights":["1h/24h/72h","SMS guardrail"],"metrics":["Flow map"]}';
    return runKlaviyoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getKlaviyoFlowAgent(): KlaviyoFlowAgent {
  return KlaviyoFlowAgent.instance;
}

export function resetKlaviyoFlowAgentForTests(): void {
  KlaviyoFlowAgent.reset();
}
