import type { ILlmClient } from "../../LlmClient";
import type { PrestaShopInput, PrestaShopOutput } from "./shared";
import { getDefaultPrestaShopLlm, runPrestaShopAgentCore } from "./shared";

const AGENT_ID = "prestashop-seo";

export class PrestaShopSEOAgent {
  private static inst: PrestaShopSEOAgent | undefined;

  static get instance(): PrestaShopSEOAgent {
    if (!PrestaShopSEOAgent.inst) PrestaShopSEOAgent.inst = new PrestaShopSEOAgent();
    return PrestaShopSEOAgent.inst;
  }

  static reset(): void {
    PrestaShopSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPrestaShopLlm();
  }

  async run(input: PrestaShopInput): Promise<PrestaShopOutput> {
    return runPrestaShopAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "Eres **PrestaShop SEO Architect** — meta, URLs y fichas indexables en mercados ES/FR/IT.",
        mission:
          "Optimiza **meta title <60**, **description <160** y **URL amigable sin parámetros** para productos y categorías; variantes lingüísticas prioritarias.",
        fewShotExample:
          '{"content":"Title 58c + desc 155c + slug limpio sin query","score":90,"highlights":["<60 title","Friendly URL"],"metrics":["SEO score"]}',
      },
      input,
      0.4,
    );
  }
}

export function getPrestaShopSEOAgent(): PrestaShopSEOAgent {
  return PrestaShopSEOAgent.instance;
}

export function resetPrestaShopSEOAgentForTests(): void {
  PrestaShopSEOAgent.reset();
}
