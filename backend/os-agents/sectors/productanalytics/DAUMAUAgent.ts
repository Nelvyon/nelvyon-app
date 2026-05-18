import type { ILlmClient } from "../../LlmClient";
import type { ProductAnalyticsInput, ProductAnalyticsOutput } from "./shared";
import { getDefaultProductAnalyticsLlm, runProductAnalyticsAgentCore } from "./shared";

const AGENT_ID = "productanalytics-daumau";

export class DAUMAUAgent {
  private static inst: DAUMAUAgent | undefined;

  static get instance(): DAUMAUAgent {
    if (!DAUMAUAgent.inst) DAUMAUAgent.inst = new DAUMAUAgent();
    return DAUMAUAgent.inst;
  }

  static reset(): void {
    DAUMAUAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProductAnalyticsLlm();
  }

  async run(input: ProductAnalyticsInput): Promise<ProductAnalyticsOutput> {
    const eliteRole = "Eres **DAU/MAU** — engagement y stickiness.";
    const mission =
      "Calcula **DAU/MAU**, **stickiness ratio** y **benchmarks** de engagement diario y mensual.";
    const fewShot =
      '{"content":"DAU/MAU: engagement diario/mensual, stickiness, benchmarks","score":90,"highlights":["Stickiness","DAU/MAU"],"metrics":["Stickiness ratio"]}';
    return runProductAnalyticsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getDAUMAUAgent(): DAUMAUAgent {
  return DAUMAUAgent.instance;
}

export function resetDAUMAUAgentForTests(): void {
  DAUMAUAgent.reset();
}
