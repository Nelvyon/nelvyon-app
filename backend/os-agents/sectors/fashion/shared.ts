import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";
import { getSeedByIndex } from "../../seeds/seed-selector";

export interface FashionInput {
  brandName: string;
  category: string;
  targetAudience: string;
  priceRange: string;
  tone: string;
  season?: string;
  seedIndex?: number;
}

export { getSeedByIndex };

export interface FashionOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function fashionLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("fashion_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}

