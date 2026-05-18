import type { ILlmClient } from "../../LlmClient";
import type { CryptoInput, CryptoOutput } from "./shared";
import { getDefaultCryptoLlm, runCryptoAgentCore } from "./shared";

const AGENT_ID = "crypto-reviews";

let inst: CryptoReviewsAgent | null = null;

export class CryptoReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CryptoReviewsAgent {
    if (!inst) inst = new CryptoReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCryptoLlm();
  }

  async run(input: CryptoInput): Promise<CryptoOutput> {
    const eliteRole = "Eres **Crypto Reviews** — reputación y trust.";
    const mission =
      "Diseña **reputación de proyecto** y **trust building** (auditorías mencionadas, transparencia equipo, crisis FUD).";
    const fewShot =
      '{"result":"Página trust + respuesta FUD","score":90,"recommendations":["Multisig público","Post-mortem hacks sector"]}';
    return runCryptoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCryptoReviewsAgent(): CryptoReviewsAgent {
  return CryptoReviewsAgent.instance();
}

export function resetCryptoReviewsAgentForTests(): void {
  inst = null;
}
