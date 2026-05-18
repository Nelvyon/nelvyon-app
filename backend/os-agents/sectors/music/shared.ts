import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export interface MusicInput {
  artistName: string;
  genre: string;
  targetAudience: string;
  tone: string;
  releaseType?: string;
}

export interface MusicOutput {
  agentId: string;
  result: string;
  generatedAt: string;
}

export function llmOpts(temperature: number): LlmOptions {
  return { ...ModelRouter.getModel("music_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS, temperature };
}

