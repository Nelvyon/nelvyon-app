import type { ILlmClient } from "../../LlmClient";
import type { CryptoInput, CryptoOutput } from "./shared";
import { getDefaultCryptoLlm, runCryptoAgentCore } from "./shared";

const AGENT_ID = "crypto-seo";

let inst: CryptoSEOAgent | null = null;

export class CryptoSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CryptoSEOAgent {
    if (!inst) inst = new CryptoSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCryptoLlm();
  }

  async run(input: CryptoInput): Promise<CryptoOutput> {
    const eliteRole = "Eres **Crypto SEO** — cripto y Web3.";
    const mission =
      "Diseña **SEO y contenido Web3** (documentación, glosario, hubs técnicos, YMYL prudente).";
    const fewShot =
      '{"result":"Pilar protocolo + hub glosario","score":92,"recommendations":["FAQ riesgos","Internal linking docs"]}';
    return runCryptoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCryptoSEOAgent(): CryptoSEOAgent {
  return CryptoSEOAgent.instance();
}

export function resetCryptoSEOAgentForTests(): void {
  inst = null;
}
