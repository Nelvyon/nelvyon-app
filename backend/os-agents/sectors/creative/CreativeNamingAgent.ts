import type { ILlmClient } from "../../LlmClient";
import type { CreativeInput, CreativeOutput } from "./shared";
import { getDefaultCreativeLlm, runCreativeAgentCore } from "./shared";

const AGENT_ID = "creative-naming";

export class CreativeNamingAgent {
  private static inst: CreativeNamingAgent | undefined;

  static get instance(): CreativeNamingAgent {
    if (!CreativeNamingAgent.inst) CreativeNamingAgent.inst = new CreativeNamingAgent();
    return CreativeNamingAgent.inst;
  }

  static reset(): void {
    CreativeNamingAgent.inst = undefined;
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
          "ROLE: Naming strategist top 1%; disponibilidad dominio como hipótesis verificable.",
        mission:
          "Genera nombres de producto, campaña o servicio con checks lingüísticos y sugerencia .com/.io (marcar verificación manual).",
        fewShotExample:
          "Input: servicio AI legal. Output JSON: shortlist nombres; variants estilo abstracto vs descriptivo; formats naming deck.",
      },
      input,
    );
  }
}

export function getCreativeNamingAgent(): CreativeNamingAgent {
  return CreativeNamingAgent.instance;
}

export function resetCreativeNamingAgentForTests(): void {
  CreativeNamingAgent.reset();
}
