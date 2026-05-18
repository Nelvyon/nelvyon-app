import type { ILlmClient } from "../../LlmClient";
import type { PublicApiInput, PublicApiOutput } from "./shared";
import { getDefaultPublicApiLlm, runPublicApiAgentCore } from "./shared";

const AGENT_ID = "publicapi-auth";

export class PublicApiAuthAgent {
  private static inst: PublicApiAuthAgent | undefined;

  static get instance(): PublicApiAuthAgent {
    if (!PublicApiAuthAgent.inst) PublicApiAuthAgent.inst = new PublicApiAuthAgent();
    return PublicApiAuthAgent.inst;
  }

  static reset(): void {
    PublicApiAuthAgent.inst = undefined;
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
        eliteRole: "ROLE: API key lifecycle; nlv_live_ vs nlv_test_; solo persistir hash.",
        mission:
          "Gestiona API keys: generación, rotación, revocación; referencia tabla **api_keys** (key_hash, plan, req_count, last_used).",
        fewShotExample:
          '{"content":"Rotación key live; prev revocada.","score":93,"highlights":["nlv_live_","Hash SHA-256"],"metrics":["Rotación OK"]}',
      },
      input,
      0.1,
    );
  }
}

export function getPublicApiAuthAgent(): PublicApiAuthAgent {
  return PublicApiAuthAgent.instance;
}

export function resetPublicApiAuthAgentForTests(): void {
  PublicApiAuthAgent.reset();
}
