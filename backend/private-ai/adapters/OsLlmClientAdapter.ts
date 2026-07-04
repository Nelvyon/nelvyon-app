import type { ILlmClient, LlmOptions } from "../../os-agents/LlmClient";
import { getPrivateAiRouter } from "../core/PrivateAiRouter";
import type { PrivateAiSettings } from "../types";

/**
 * Adapter OS packs → Private AI router.
 * NOT wired into os-agents yet — import when ready to migrate off OpenAI-only LlmClient.
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
