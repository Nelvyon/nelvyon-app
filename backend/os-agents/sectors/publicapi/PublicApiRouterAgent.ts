import type { ILlmClient } from "../../LlmClient";
import type { PublicApiInput, PublicApiOutput } from "./shared";
import { getDefaultPublicApiLlm, runPublicApiAgentCore } from "./shared";

const AGENT_ID = "publicapi-router";

export class PublicApiRouterAgent {
  private static inst: PublicApiRouterAgent | undefined;

  static get instance(): PublicApiRouterAgent {
    if (!PublicApiRouterAgent.inst) PublicApiRouterAgent.inst = new PublicApiRouterAgent();
    return PublicApiRouterAgent.inst;
  }

  static reset(): void {
    PublicApiRouterAgent.inst = undefined;
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
        eliteRole: "ROLE: Edge router → OS agent registry.",
        mission:
          "Enruta requests HTTP externos al agente OS correcto según path, método y payload (integraciones v2).",
        fewShotExample:
          '{"content":"POST /v2/agents/seo/run → SeoPremium mapping.","score":90,"highlights":["Path→agent","Auth"],"metrics":["404 si unknown"]}',
      },
      input,
      0.2,
    );
  }
}

export function getPublicApiRouterAgent(): PublicApiRouterAgent {
  return PublicApiRouterAgent.instance;
}

export function resetPublicApiRouterAgentForTests(): void {
  PublicApiRouterAgent.reset();
}
