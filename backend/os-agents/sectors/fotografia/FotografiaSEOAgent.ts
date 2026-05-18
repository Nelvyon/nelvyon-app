import type { ILlmClient } from "../../LlmClient";
import type { FotografiaInput, FotografiaOutput } from "./shared";
import { getDefaultFotografiaLlm, runFotografiaAgentCore } from "./shared";

const AGENT_ID = "fotografia-seo";

let inst: FotografiaSEOAgent | null = null;

export class FotografiaSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FotografiaSEOAgent {
    if (!inst) inst = new FotografiaSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFotografiaLlm();
  }

  async run(input: FotografiaInput): Promise<FotografiaOutput> {
    const eliteRole = "Eres **Fotografía SEO** — local y nicho.";
    const mission =
      "Diseña **SEO local** y por **especialidad fotográfica** (long-tail ciudad + servicio, blog técnico).";
    const fewShot =
      '{"result":"Clusters bodas Málaga + producto Amazon","score":92,"recommendations":["Alt text masivo","FAQ sesión"]}';
    return runFotografiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFotografiaSEOAgent(): FotografiaSEOAgent {
  return FotografiaSEOAgent.instance();
}

export function resetFotografiaSEOAgentForTests(): void {
  inst = null;
}
