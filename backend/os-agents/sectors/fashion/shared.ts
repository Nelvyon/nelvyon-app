import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface FashionInput {
  brandName: string;
  category: string;
  targetAudience: string;
  priceRange: string;
  tone: string;
  season?: string;
}

export interface FashionOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function fashionLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("fashion_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}

