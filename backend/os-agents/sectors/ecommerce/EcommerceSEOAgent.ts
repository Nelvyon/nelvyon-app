import type { ILlmClient } from "../../LlmClient";
import type { EcommerceInput, EcommerceOutput } from "./shared";
import { getDefaultEcommerceLlm, runEcommerceAgentCore } from "./shared";

const AGENT_ID = "ecommerce-ecommerceseo";

export class EcommerceSEOAgent {
  private static inst: EcommerceSEOAgent | undefined;

  static get instance(): EcommerceSEOAgent {
    if (!EcommerceSEOAgent.inst) EcommerceSEOAgent.inst = new EcommerceSEOAgent();
    return EcommerceSEOAgent.inst;
  }

  static reset(): void {
    EcommerceSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceLlm();
  }

  async run(input: EcommerceInput): Promise<EcommerceOutput> {
    const eliteRole = "Eres **Ecommerce SEO** — SEO de categorías y fichas.";
    const mission =
      "Optimiza **SEO de categorías y fichas producto** con **schema markup** y **rich snippets** en **<2 min** por ficha.";
    const fewShot =
      '{"content":"SEO: categorías, fichas, schema, rich snippets, <2 min/ficha","score":93,"highlights":["<2 min/ficha","Schema markup"],"metrics":["PDP SEO time"]}';
    return runEcommerceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getEcommerceSEOAgent(): EcommerceSEOAgent {
  return EcommerceSEOAgent.instance;
}

export function resetEcommerceSEOAgentForTests(): void {
  EcommerceSEOAgent.reset();
}
