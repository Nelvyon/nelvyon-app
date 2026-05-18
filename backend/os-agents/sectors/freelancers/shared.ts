import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface FreelancerInput {
  professionalName: string;
  specialty: string;
  targetClient: string;
  tone: string;
  location?: string;
}

export interface FreelancerOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function llmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("freelancers_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}

