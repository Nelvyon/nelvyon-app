import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface HomeInput {
  businessName: string;
  serviceType: string;
  targetArea: string;
  tone: string;
  urgency?: string;
}

export interface HomeOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function homeLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("home_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
