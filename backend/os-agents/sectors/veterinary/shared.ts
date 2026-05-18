import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface VetInput {
  businessName: string;
  serviceType: string;
  targetPet: string;
  tone: string;
  location?: string;
}

export interface VetOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function vetLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("veterinary_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
