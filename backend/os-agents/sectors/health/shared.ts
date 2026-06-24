import type { LlmOptions } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LLM_DEFAULT_MAX_TOKENS } from "../../LlmClient";
import { getSeedByIndex } from "../../seeds/seed-selector";

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

/** Returns a seed context snippet for a health/clinicas agent prompt. */
export function buildHealthSeedContext(seedIndex = 0): string {
  const seed = getSeedByIndex("clinicas", seedIndex);
  if (!seed) return "";
  return `\nSEED TEMPLATE (adaptar a la clínica):\n- Headline: ${seed.headline}\n- CTA: ${seed.cta_label}\n- Chatbot: ${seed.chatbot_greeting}`;
}

