import type { ILlmClient } from "../../LlmClient";
import type { ReferralInput, ReferralOutput } from "./shared";
import { getDefaultReferralLlm, runReferralAgentCore } from "./shared";

const AGENT_ID = "referral-fraud-detector";

export class ReferralFraudDetectorAgent {
  private static inst: ReferralFraudDetectorAgent | undefined;

  static get instance(): ReferralFraudDetectorAgent {
    if (!ReferralFraudDetectorAgent.inst) ReferralFraudDetectorAgent.inst = new ReferralFraudDetectorAgent();
    return ReferralFraudDetectorAgent.inst;
  }

  static reset(): void {
    ReferralFraudDetectorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultReferralLlm();
  }

  async run(input: ReferralInput): Promise<ReferralOutput> {
    return runReferralAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Trust & safety top 1%; bloqueos proporcionados con apelación.",
        mission:
          "Detecta auto-referidos y abuso: misma IP, mismo device fingerprint, patrones circulares; recomienda bloqueo y revisión.",
        fewShotExample:
          '{"content":"Señal fuerte: signup referido desde IP = última sesión referidor en 24h.","score":88,"highlights":["BLOCK si IP match","BLOCK si device_id match"],"metrics":["Score fraude 0-100","Cola revisión manual"]}',
      },
      input,
      0.1,
    );
  }
}

export function getReferralFraudDetectorAgent(): ReferralFraudDetectorAgent {
  return ReferralFraudDetectorAgent.instance;
}

export function resetReferralFraudDetectorAgentForTests(): void {
  ReferralFraudDetectorAgent.reset();
}
