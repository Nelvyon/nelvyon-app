import type { ILlmClient } from "../../LlmClient";
import type { PublicApiInput, PublicApiOutput } from "./shared";
import { getDefaultPublicApiLlm, runPublicApiAgentCore } from "./shared";

const AGENT_ID = "publicapi-docs";

export class PublicApiDocsAgent {
  private static inst: PublicApiDocsAgent | undefined;

  static get instance(): PublicApiDocsAgent {
    if (!PublicApiDocsAgent.inst) PublicApiDocsAgent.inst = new PublicApiDocsAgent();
    return PublicApiDocsAgent.inst;
  }

  static reset(): void {
    PublicApiDocsAgent.inst = undefined;
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
        eliteRole: "ROLE: OpenAPI 3.0 spec generator from OS surface.",
        mission:
          "Genera documentación **OpenAPI 3.0** automática: paths, schemas, seguridad ApiKey, rate limit notes.",
        fewShotExample:
          '{"content":"openapi: 3.0.3 info title NELVYON Public API.","score":88,"highlights":["components.securitySchemes"],"metrics":["/v2/* paths"]}',
      },
      input,
      0.4,
    );
  }
}

export function getPublicApiDocsAgent(): PublicApiDocsAgent {
  return PublicApiDocsAgent.instance;
}

export function resetPublicApiDocsAgentForTests(): void {
  PublicApiDocsAgent.reset();
}
