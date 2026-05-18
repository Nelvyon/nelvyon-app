import type { ILlmClient } from "../../LlmClient";
import type { CryptoInput, CryptoOutput } from "./shared";
import { getDefaultCryptoLlm, runCryptoAgentCore } from "./shared";

const AGENT_ID = "crypto-launch";

let inst: CryptoLaunchAgent | null = null;

export class CryptoLaunchAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CryptoLaunchAgent {
    if (!inst) inst = new CryptoLaunchAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCryptoLlm();
  }

  async run(input: CryptoInput): Promise<CryptoOutput> {
    const eliteRole = "Eres **Crypto Launch** — token, NFT o protocolo.";
    const mission =
      "Diseña **estrategia de lanzamiento** para token, NFT o proyecto (fases, narrativa, checklist compliance genérica).";
    const fewShot =
      '{"result":"Roadmap TGE + post-launch","score":92,"recommendations":["Testnet campaign","Partners KOL filtrados"]}';
    return runCryptoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCryptoLaunchAgent(): CryptoLaunchAgent {
  return CryptoLaunchAgent.instance();
}

export function resetCryptoLaunchAgentForTests(): void {
  inst = null;
}
