import type { ILlmClient } from "../../LlmClient";
import type { PublicApiInput, PublicApiOutput } from "./shared";
import { getDefaultPublicApiLlm, runPublicApiAgentCore } from "./shared";

const AGENT_ID = "publicapi-sandbox";

export class PublicApiSandboxAgent {
  private static inst: PublicApiSandboxAgent | undefined;

  static get instance(): PublicApiSandboxAgent {
    if (!PublicApiSandboxAgent.inst) PublicApiSandboxAgent.inst = new PublicApiSandboxAgent();
    return PublicApiSandboxAgent.inst;
  }

  static reset(): void {
    PublicApiSandboxAgent.inst = undefined;
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
        eliteRole: "ROLE: Isolated tenant for nlv_test keys; no prod side-effects.",
        mission:
          "Entorno sandbox para testing: claves **nlv_test_**, datos sintéticos, webhooks a URLs de staging; sin impacto en producción.",
        fewShotExample:
          '{"content":"Sandbox workspace shadow jobs only.","score":89,"highlights":["nlv_test_","No billing"],"metrics":["Quota menor"]}',
      },
      input,
      0.4,
    );
  }
}

export function getPublicApiSandboxAgent(): PublicApiSandboxAgent {
  return PublicApiSandboxAgent.instance;
}

export function resetPublicApiSandboxAgentForTests(): void {
  PublicApiSandboxAgent.reset();
}
