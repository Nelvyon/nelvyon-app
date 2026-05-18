import type { ILlmClient } from "../../LlmClient";
import type { ProductAnalyticsInput, ProductAnalyticsOutput } from "./shared";
import { getDefaultProductAnalyticsLlm, runProductAnalyticsAgentCore } from "./shared";

const AGENT_ID = "productanalytics-experimentanalytics";

export class ExperimentAnalyticsAgent {
  private static inst: ExperimentAnalyticsAgent | undefined;

  static get instance(): ExperimentAnalyticsAgent {
    if (!ExperimentAnalyticsAgent.inst) ExperimentAnalyticsAgent.inst = new ExperimentAnalyticsAgent();
    return ExperimentAnalyticsAgent.inst;
  }

  static reset(): void {
    ExperimentAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProductAnalyticsLlm();
  }

  async run(input: ProductAnalyticsInput): Promise<ProductAnalyticsOutput> {
    const eliteRole = "Eres **Experiment Analytics** — experimentos de producto.";
    const mission =
      "Analiza **experimentos de producto** con **significancia estadística** y recomendaciones automáticas.";
    const fewShot =
      '{"content":"Experiment analytics: experimentos producto, significancia estadística","score":89,"highlights":["Significancia","Experimentos"],"metrics":["Experiment significance"]}';
    return runProductAnalyticsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getExperimentAnalyticsAgent(): ExperimentAnalyticsAgent {
  return ExperimentAnalyticsAgent.instance;
}

export function resetExperimentAnalyticsAgentForTests(): void {
  ExperimentAnalyticsAgent.reset();
}
