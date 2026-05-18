import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";

export interface MediaInput {
  niche: string;
  audienceSize?: number;
  format?: string;
  topic: string;
  tone?: string;
}

export interface MediaOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function mediaLlmOpts(temperature = 0.4): LlmOptions {
  return { ...ModelRouter.getModel("media_shared"), maxTokens: 4000, temperature };
}
