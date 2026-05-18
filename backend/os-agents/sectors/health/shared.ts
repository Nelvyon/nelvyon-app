import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface HealthInput {
  clinicName: string;
  specialty: string;
  targetPatient: string;
  tone: string;
  location?: string;
}

export interface HealthOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function healthLlmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("health_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}

