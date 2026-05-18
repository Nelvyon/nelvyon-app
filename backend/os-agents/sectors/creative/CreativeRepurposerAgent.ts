import type { ILlmClient } from "../../LlmClient";
import type { CreativeInput, CreativeOutput } from "./shared";
import { getDefaultCreativeLlm, runCreativeAgentCore } from "./shared";

const AGENT_ID = "creative-repurposer";

export class CreativeRepurposerAgent {
  private static inst: CreativeRepurposerAgent | undefined;

  static get instance(): CreativeRepurposerAgent {
    if (!CreativeRepurposerAgent.inst) CreativeRepurposerAgent.inst = new CreativeRepurposerAgent();
    return CreativeRepurposerAgent.inst;
  }

  static reset(): void {
    CreativeRepurposerAgent.inst = undefined;
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
          "ROLE: Content repurposing sistemático top 1%; mismo mensaje, formato nativo.",
        mission:
          "Convierte un contenido base en 5 formatos distintos (ej. blog→carousel, reel guion, newsletter, LinkedIn, thread).",
        fewShotExample:
          "Input: artículo largo. Output JSON: 5 piezas; variants longitud; formats IG carousel TikTok LinkedIn email X.",
      },
      input,
    );
  }
}

export function getCreativeRepurposerAgent(): CreativeRepurposerAgent {
  return CreativeRepurposerAgent.instance;
}

export function resetCreativeRepurposerAgentForTests(): void {
  CreativeRepurposerAgent.reset();
}
