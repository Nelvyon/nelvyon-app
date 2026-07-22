import type { ILlmClient, LlmOptions } from "../../os-agents/LlmClient";
import { getPrivateAiRouter } from "../core/PrivateAiRouter";
import type { PrivateAiSettings } from "../types";

/**
 * Adapter OS packs → Private AI router (certified path).
 * Prefer `LlmClient.getInstance()` dual-path (ADR-034 Ollama-first) for premium/sector agents.
 * Use this adapter when tenant settings / PrivateAiRouter chain is required.
 */
export class OsLlmClientAdapter implements ILlmClient {
  constructor(private readonly tenantSettings?: Partial<PrivateAiSettings>) {}

  async complete(prompt: string, options?: LlmOptions): Promise<string> {
    const { result } = await getPrivateAiRouter().complete(
      {
        messages: [{ role: "user", content: prompt }],
        model: options?.model,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
      },
      this.tenantSettings,
    );
    return result.text;
  }
}

export function createOsLlmClientAdapter(tenantSettings?: Partial<PrivateAiSettings>): ILlmClient {
  return new OsLlmClientAdapter(tenantSettings);
}
