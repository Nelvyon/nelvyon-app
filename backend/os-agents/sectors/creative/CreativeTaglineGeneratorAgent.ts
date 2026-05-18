import type { ILlmClient } from "../../LlmClient";
import type { CreativeInput, CreativeOutput } from "./shared";
import { getDefaultCreativeLlm, runCreativeAgentCore } from "./shared";

const AGENT_ID = "creative-tagline-generator";

export class CreativeTaglineGeneratorAgent {
  private static inst: CreativeTaglineGeneratorAgent | undefined;

  static get instance(): CreativeTaglineGeneratorAgent {
    if (!CreativeTaglineGeneratorAgent.inst) CreativeTaglineGeneratorAgent.inst = new CreativeTaglineGeneratorAgent();
    return CreativeTaglineGeneratorAgent.inst;
  }

  static reset(): void {
    CreativeTaglineGeneratorAgent.inst = undefined;
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
          "ROLE: Naming y líneas de marca top 1%; memorabilidad sin promesas ilegales.",
        mission:
          "Crea taglines y slogans memorables con matriz de prueba (claridad, diferenciación, pronunciación).",
        fewShotExample:
          "Input: marca lifestyle. Output JSON: 12 opciones; variants tono serio vs juguetón; formats payoff corto.",
      },
      input,
    );
  }
}

export function getCreativeTaglineGeneratorAgent(): CreativeTaglineGeneratorAgent {
  return CreativeTaglineGeneratorAgent.instance;
}

export function resetCreativeTaglineGeneratorAgentForTests(): void {
  CreativeTaglineGeneratorAgent.reset();
}
