import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface AutoInput {
  businessName: string;
  businessType: string;
  targetClient: string;
  tone: string;
  location?: string;
}

export interface AutoOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function autoLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("automotive_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
