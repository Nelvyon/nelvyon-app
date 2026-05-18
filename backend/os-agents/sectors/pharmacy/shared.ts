import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface PharmacyInput {
  businessName: string;
  businessType: string;
  targetClient: string;
  tone: string;
  location?: string;
}

export interface PharmacyOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function pharmacyLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("pharmacy_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
