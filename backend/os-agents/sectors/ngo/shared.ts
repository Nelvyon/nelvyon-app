import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface NgoInput {
  organizationName: string;
  cause: string;
  targetAudience: string;
  tone: string;
  country?: string;
}

export interface NgoOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function ngoLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("ngo_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
