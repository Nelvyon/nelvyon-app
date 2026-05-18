import type { ILlmClient } from "../../LlmClient";
import type { CreativeInput, CreativeOutput } from "./shared";
import { getDefaultCreativeLlm, runCreativeAgentCore } from "./shared";

const AGENT_ID = "creative-product-desc";

export class CreativeProductDescAgent {
  private static inst: CreativeProductDescAgent | undefined;

  static get instance(): CreativeProductDescAgent {
    if (!CreativeProductDescAgent.inst) CreativeProductDescAgent.inst = new CreativeProductDescAgent();
    return CreativeProductDescAgent.inst;
  }

  static reset(): void {
    CreativeProductDescAgent.inst = undefined;
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
          "ROLE: Ecommerce conversion copy top 1%; specs honestas y escaneabilidad.",
        mission:
          "Redacta descripciones de producto que convierten: titulo corto, bullets beneficio, FAQs cortas, SEO ligero.",
        fewShotExample:
          "Input: electrónica. Output JSON: PDP largo + resumen; variants formal vs gen Z; formats bullet vs storytelling.",
      },
      input,
    );
  }
}

export function getCreativeProductDescAgent(): CreativeProductDescAgent {
  return CreativeProductDescAgent.instance;
}

export function resetCreativeProductDescAgentForTests(): void {
  CreativeProductDescAgent.reset();
}
