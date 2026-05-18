import { OsAgentError } from "../OsAgentError";
import type { ILlmClient } from "../LlmClient";

export async function completeLlmStep(llm: ILlmClient, stepName: string, prompt: string): Promise<string> {
  try {
    return await llm.complete(prompt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new OsAgentError(`${stepName}: ${msg}`, "llm_step");
  }
}
