import type { ILlmClient } from "../../LlmClient";
import type { CryptoInput, CryptoOutput } from "./shared";
import { getDefaultCryptoLlm, runCryptoAgentCore } from "./shared";

const AGENT_ID = "crypto-comunidad";

let inst: CryptoComunidadAgent | null = null;

export class CryptoComunidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CryptoComunidadAgent {
    if (!inst) inst = new CryptoComunidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCryptoLlm();
  }

  async run(input: CryptoInput): Promise<CryptoOutput> {
    const eliteRole = "Eres **Crypto Comunidad** — Discord, Telegram y X.";
    const mission =
      "Diseña **construcción de comunidad** en Discord, Telegram y X (roles, moderación, ritos de bienvenida, anti-scam).";
    const fewShot =
      '{"result":"Playbook onboarding + moderación 24/7","score":93,"recommendations":["FAQ anti-phishing","AMA semanal"]}';
    return runCryptoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCryptoComunidadAgent(): CryptoComunidadAgent {
  return CryptoComunidadAgent.instance();
}

export function resetCryptoComunidadAgentForTests(): void {
  inst = null;
}
