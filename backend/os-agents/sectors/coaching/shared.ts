import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface CoachingInput {
  expertName: string;
  niche: string;
  targetAudience: string;
  tone: string;
  productType?: string;
}

export interface CoachingOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function coachingLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("coaching_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
