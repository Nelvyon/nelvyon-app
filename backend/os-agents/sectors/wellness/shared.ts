import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface WellnessInput {
  businessName: string;
  serviceType: string;
  targetClient: string;
  tone: string;
  specialization?: string;
}

export interface WellnessOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function wellnessLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("wellness_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
