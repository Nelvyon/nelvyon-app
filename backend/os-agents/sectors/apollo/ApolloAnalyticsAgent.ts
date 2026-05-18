import type { ILlmClient } from "../../LlmClient";
import type { ApolloInput, ApolloOutput } from "./shared";
import { getDefaultApolloLlm, runApolloAgentCore } from "./shared";

const AGENT_ID = "apollo-analytics";

export class ApolloAnalyticsAgent {
  private static inst: ApolloAnalyticsAgent | undefined;

  static get instance(): ApolloAnalyticsAgent {
    if (!ApolloAnalyticsAgent.inst) ApolloAnalyticsAgent.inst = new ApolloAnalyticsAgent();
    return ApolloAnalyticsAgent.inst;
  }

  static reset(): void {
    ApolloAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultApolloLlm();
  }

  async run(input: ApolloInput): Promise<ApolloOutput> {
    const eliteRole =
      "Eres **Apollo.io Revenue Analyst** — métricas de outreach, funnel y atribución a pipeline.";
    const mission =
      "Informe **métricas Apollo**: **reply rate**, **open rate**, **meetings booked**, **pipeline**; benchmarks vs objetivos **reply >8%** y **meetings >2%**.";
    const fewShot =
      '{"content":"Reply 9% open 42% meetings 2.4% pipeline $120k","score":93,"highlights":["Reply rate","Meetings booked"],"metrics":["Pipeline"]}';
    return runApolloAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getApolloAnalyticsAgent(): ApolloAnalyticsAgent {
  return ApolloAnalyticsAgent.instance;
}

export function resetApolloAnalyticsAgentForTests(): void {
  ApolloAnalyticsAgent.reset();
}
