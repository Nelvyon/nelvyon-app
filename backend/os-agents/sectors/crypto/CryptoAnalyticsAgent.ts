import type { ILlmClient } from "../../LlmClient";
import type { CryptoInput, CryptoOutput } from "./shared";
import { getDefaultCryptoLlm, runCryptoAgentCore } from "./shared";

const AGENT_ID = "crypto-analytics";

let inst: CryptoAnalyticsAgent | null = null;

export class CryptoAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CryptoAnalyticsAgent {
    if (!inst) inst = new CryptoAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCryptoLlm();
  }

  async run(input: CryptoInput): Promise<CryptoOutput> {
    const eliteRole = "Eres **Crypto Analytics** — holders y TVL.";
    const mission =
      "Diseña **analytics de holders**, wallets activas y **TVL** (cohortes on-chain agregadas, retención producto).";
    const fewShot =
      '{"result":"Dashboard TVL + MAU wallet","score":92,"recommendations":["Cohort staking","Alerta outflow"]}';
    return runCryptoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCryptoAnalyticsAgent(): CryptoAnalyticsAgent {
  return CryptoAnalyticsAgent.instance();
}

export function resetCryptoAnalyticsAgentForTests(): void {
  inst = null;
}
