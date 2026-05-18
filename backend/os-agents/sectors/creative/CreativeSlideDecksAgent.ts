import type { ILlmClient } from "../../LlmClient";
import type { CreativeInput, CreativeOutput } from "./shared";
import { getDefaultCreativeLlm, runCreativeAgentCore } from "./shared";

const AGENT_ID = "creative-slide-decks";

export class CreativeSlideDecksAgent {
  private static inst: CreativeSlideDecksAgent | undefined;

  static get instance(): CreativeSlideDecksAgent {
    if (!CreativeSlideDecksAgent.inst) CreativeSlideDecksAgent.inst = new CreativeSlideDecksAgent();
    return CreativeSlideDecksAgent.inst;
  }

  static reset(): void {
    CreativeSlideDecksAgent.inst = undefined;
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
          "ROLE: Narrativa de pitch deck top 1%; una idea por slide.",
        mission:
          "Genera estructura y copy para presentación ventas/pitch: outline, titulares slide, notas orador.",
        fewShotExample:
          "Input: SaaS Serie A. Output JSON: 12 slides; variants narrativa VC vs cliente; formats Keynote/PDF.",
      },
      input,
    );
  }
}

export function getCreativeSlideDecksAgent(): CreativeSlideDecksAgent {
  return CreativeSlideDecksAgent.instance;
}

export function resetCreativeSlideDecksAgentForTests(): void {
  CreativeSlideDecksAgent.reset();
}
