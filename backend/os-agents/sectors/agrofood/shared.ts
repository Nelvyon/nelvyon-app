import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface AgroInput {
  businessName: string;
  productType: string;
  targetMarket: string;
  tone: string;
  origin?: string;
}

export interface AgroOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function agroLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("agrofood_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
