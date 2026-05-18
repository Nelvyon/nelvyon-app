import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface BuildInput {
  businessName: string;
  serviceType: string;
  targetClient: string;
  tone: string;
  location?: string;
}

export interface BuildOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function buildLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("construction_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}
