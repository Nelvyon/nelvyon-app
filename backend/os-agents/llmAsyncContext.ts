import { AsyncLocalStorage } from "node:async_hooks";

/** OpenAI API key resolved for the current OS job (user override or NELVYON fallback). */
const openAiKeyStorage = new AsyncLocalStorage<string>();

export function getCurrentOpenAiApiKey(): string | undefined {
  return openAiKeyStorage.getStore();
}

export function runWithOpenAiApiKey<T>(apiKey: string, fn: () => Promise<T>): Promise<T> {
  return openAiKeyStorage.run(apiKey, fn);
}
