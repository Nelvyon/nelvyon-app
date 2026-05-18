import type { ILlmClient } from "../../LlmClient";
import type { CryptoInput, CryptoOutput } from "./shared";
import { getDefaultCryptoLlm, runCryptoAgentCore } from "./shared";

const AGENT_ID = "crypto-social";

let inst: CryptoSocialAgent | null = null;

export class CryptoSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CryptoSocialAgent {
    if (!inst) inst = new CryptoSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCryptoLlm();
  }

  async run(input: CryptoInput): Promise<CryptoOutput> {
    const eliteRole = "Eres **Crypto Social** — X, Discord, Telegram.";
    const mission =
      "Diseña **growth** en X, Discord y Telegram (threads, spaces, campañas coordinadas, anti-bot).";
    const fewShot =
      '{"result":"Calendario growth + métricas vanity vs real","score":90,"recommendations":["Raid guidelines","Proof-of-human"]}';
    return runCryptoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCryptoSocialAgent(): CryptoSocialAgent {
  return CryptoSocialAgent.instance();
}

export function resetCryptoSocialAgentForTests(): void {
  inst = null;
}
