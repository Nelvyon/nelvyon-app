import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface StartupInput {
  startupName: string;
  productDescription: string;
  targetMarket: string;
  stage: string;
  tone: string;
}

export interface StartupOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function llmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("startups_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}

