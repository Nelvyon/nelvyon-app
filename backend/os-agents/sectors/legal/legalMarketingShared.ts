import type { LlmOptions } from "../../LlmClient";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";

export interface LegalMarketingInput {
  firmName: string;
  practiceArea: string;
  targetClient: string;
  tone: string;
  location?: string;
}

export interface LegalMarketingOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function legalMarketingLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("legal_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
