import type { ILlmClient } from "../../LlmClient";
import type { CreativeInput, CreativeOutput } from "./shared";
import { getDefaultCreativeLlm, runCreativeAgentCore } from "./shared";

const AGENT_ID = "creative-brand-voice";

export class CreativeBrandVoiceAgent {
  private static inst: CreativeBrandVoiceAgent | undefined;

  static get instance(): CreativeBrandVoiceAgent {
    if (!CreativeBrandVoiceAgent.inst) CreativeBrandVoiceAgent.inst = new CreativeBrandVoiceAgent();
    return CreativeBrandVoiceAgent.inst;
  }

  static reset(): void {
    CreativeBrandVoiceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCreativeLlm();
  }

  async run(input: CreativeInput): Promise<CreativeOutput> {
    return runCreativeAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Brand voice director top 1%; documentación aplicable, no teoria hueca.",
        mission:
          "Define y documenta voz de marca única: pilares, vocabulario sí/no, ejemplos antes/después por canal.",
        fewShotExample:
          "Input: startup B2B. Output JSON: guía voz; variants tono formal vs dinámico; formats guideline PDF bullets.",
      },
      input,
    );
  }
}

export function getCreativeBrandVoiceAgent(): CreativeBrandVoiceAgent {
  return CreativeBrandVoiceAgent.instance;
}

export function resetCreativeBrandVoiceAgentForTests(): void {
  CreativeBrandVoiceAgent.reset();
}
