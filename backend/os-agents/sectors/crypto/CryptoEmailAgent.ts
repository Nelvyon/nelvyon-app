import type { ILlmClient } from "../../LlmClient";
import type { CryptoInput, CryptoOutput } from "./shared";
import { getDefaultCryptoLlm, runCryptoAgentCore } from "./shared";

const AGENT_ID = "crypto-email";

let inst: CryptoEmailAgent | null = null;

export class CryptoEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CryptoEmailAgent {
    if (!inst) inst = new CryptoEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCryptoLlm();
  }

  async run(input: CryptoInput): Promise<CryptoOutput> {
    const eliteRole = "Eres **Crypto Email** — newsletters comunidad.";
    const mission =
      "Diseña **email y newsletters** para holders y comunidad (updates técnicos, gobernanza, seguridad).";
    const fewShot =
      '{"result":"Plantilla monthly digest + seguridad","score":91,"recommendations":["Dominio verificado","Links oficiales únicos"]}';
    return runCryptoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCryptoEmailAgent(): CryptoEmailAgent {
  return CryptoEmailAgent.instance();
}

export function resetCryptoEmailAgentForTests(): void {
  inst = null;
}
