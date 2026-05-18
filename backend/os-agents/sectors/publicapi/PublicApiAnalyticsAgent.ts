import type { ILlmClient } from "../../LlmClient";
import type { PublicApiInput, PublicApiOutput } from "./shared";
import { getDefaultPublicApiLlm, runPublicApiAgentCore } from "./shared";

const AGENT_ID = "publicapi-analytics";

export class PublicApiAnalyticsAgent {
  private static inst: PublicApiAnalyticsAgent | undefined;

  static get instance(): PublicApiAnalyticsAgent {
    if (!PublicApiAnalyticsAgent.inst) PublicApiAnalyticsAgent.inst = new PublicApiAnalyticsAgent();
    return PublicApiAnalyticsAgent.inst;
  }

  static reset(): void {
    PublicApiAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPublicApiLlm();
  }

  async run(input: PublicApiInput): Promise<PublicApiOutput> {
    return runPublicApiAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: API observability; logs agregados.",
        mission:
          "Métricas: **requests/día**, **errores**, **latencia p95**, **top endpoints** por tenant y global.",
        fewShotExample:
          '{"content":"p95 180ms; top /v2/agents/run.","score":93,"highlights":["5xx rate","RPS"],"metrics":["Series diaria"]}',
      },
      input,
      0.1,
    );
  }
}

export function getPublicApiAnalyticsAgent(): PublicApiAnalyticsAgent {
  return PublicApiAnalyticsAgent.instance;
}

export function resetPublicApiAnalyticsAgentForTests(): void {
  PublicApiAnalyticsAgent.reset();
}
