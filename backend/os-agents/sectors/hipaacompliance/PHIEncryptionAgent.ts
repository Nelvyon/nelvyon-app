import type { ILlmClient } from "../../LlmClient";
import type { HipaaComplianceInput, HipaaComplianceOutput } from "./shared";
import { getDefaultHipaaComplianceLlm, runHipaaComplianceAgentCore } from "./shared";

const AGENT_ID = "hipaacompliance-phiencryption";

export class PHIEncryptionAgent {
  private static inst: PHIEncryptionAgent | undefined;

  static get instance(): PHIEncryptionAgent {
    if (!PHIEncryptionAgent.inst) PHIEncryptionAgent.inst = new PHIEncryptionAgent();
    return PHIEncryptionAgent.inst;
  }

  static reset(): void {
    PHIEncryptionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHipaaComplianceLlm();
  }

  async run(input: HipaaComplianceInput): Promise<HipaaComplianceOutput> {
    const eliteRole = "Eres **PHI Encryption** — cifrado automático de PHI.";
    const mission =
      "Cifra **PHI en reposo y tránsito** con **gestión de claves** en **<1 segundo**; **0 PHI sin cifrar**.";
    const fewShot =
      '{"content":"PHI encryption: reposo/tránsito, claves, <1 s, 0 sin cifrar","score":95,"highlights":["<1 s encrypt","0 PHI claro"],"metrics":["Encryption latency"]}';
    return runHipaaComplianceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.15);
  }
}

export function getPHIEncryptionAgent(): PHIEncryptionAgent {
  return PHIEncryptionAgent.instance;
}

export function resetPHIEncryptionAgentForTests(): void {
  PHIEncryptionAgent.reset();
}
