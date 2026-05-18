import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface LogisticsInput {
  businessName: string;
  serviceType: string;
  targetClient: string;
  tone: string;
  coverage?: string;
}

export interface LogisticsOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function logisticsLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("logistics_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
