import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface EducationInput {
  institutionName: string;
  educationType: string;
  targetStudent: string;
  subjectArea: string;
  tone: string;
  format?: string;
}

export interface EducationOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function educationLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("education_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}

