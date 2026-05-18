import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface FinanceInput {
  companyName: string;
  serviceType: string;
  targetClient: string;
  tone: string;
  regulation?: string;
}

export interface FinanceOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function financeLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("finance_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
