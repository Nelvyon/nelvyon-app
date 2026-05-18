import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";

export type YoutubersAgentDeps = {
  llm: ILlmClient;
};

export function parseJson<T>(raw: string, label: string): T {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(`${label}: JSON inválido`);
  }
}

export function llmOpts(temperature: number): LlmOptions {
  return {
    ...ModelRouter.getModel("youtubers_shared"), maxTokens: LLM_DEFAULT_MAX_TOKENS,
    temperature,
  };
}
