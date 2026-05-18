import type { ILlmClient } from "../../LlmClient";
import type { CryptoInput, CryptoOutput } from "./shared";
import { getDefaultCryptoLlm, runCryptoAgentCore } from "./shared";

const AGENT_ID = "crypto-precios";

let inst: CryptoPreciosAgent | null = null;

export class CryptoPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CryptoPreciosAgent {
    if (!inst) inst = new CryptoPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCryptoLlm();
  }

  async run(input: CryptoInput): Promise<CryptoOutput> {
    const eliteRole = "Eres **Crypto Precios** — tokenomics y valor.";
    const mission =
      "Diseña **tokenomics** y **propuesta de valor** (emisión, utilidad, alineación stakeholders) sin prometer rendimiento.";
    const fewShot =
      '{"result":"Resumen tokenomics + vesting narrado","score":91,"recommendations":["Tabla unlocks","Utility roadmap"]}';
    return runCryptoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCryptoPreciosAgent(): CryptoPreciosAgent {
  return CryptoPreciosAgent.instance();
}

export function resetCryptoPreciosAgentForTests(): void {
  inst = null;
}
