import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface TourismInput {
  businessName: string;
  businessType: string;
  targetTraveler: string;
  tone: string;
  location?: string;
}

export interface TourismOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function tourismLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("tourism_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
