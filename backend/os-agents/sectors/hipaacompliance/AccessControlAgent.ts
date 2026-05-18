import type { ILlmClient } from "../../LlmClient";
import type { HipaaComplianceInput, HipaaComplianceOutput } from "./shared";
import { getDefaultHipaaComplianceLlm, runHipaaComplianceAgentCore } from "./shared";

const AGENT_ID = "hipaacompliance-accesscontrol";

export class AccessControlAgent {
  private static inst: AccessControlAgent | undefined;

  static get instance(): AccessControlAgent {
    if (!AccessControlAgent.inst) AccessControlAgent.inst = new AccessControlAgent();
    return AccessControlAgent.inst;
  }

  static reset(): void {
    AccessControlAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHipaaComplianceLlm();
  }

  async run(input: HipaaComplianceInput): Promise<HipaaComplianceOutput> {
    const eliteRole = "Eres **Access Control** — control granular de acceso a PHI.";
    const mission =
      "Aplica **control de acceso granular PHI**, **logs** y **alertas de acceso no autorizado**; **compliance >99%**.";
    const fewShot =
      '{"content":"Access control: granular PHI, logs, alertas no autorizado, >99%","score":93,"highlights":["Granular PHI",">99% compliance"],"metrics":["Unauthorized access alerts"]}';
    return runHipaaComplianceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getAccessControlAgent(): AccessControlAgent {
  return AccessControlAgent.instance;
}

export function resetAccessControlAgentForTests(): void {
  AccessControlAgent.reset();
}
