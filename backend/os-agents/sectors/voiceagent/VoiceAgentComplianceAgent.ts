import type { ILlmClient } from "../../LlmClient";
import type { VoiceAgentInput, VoiceAgentOutput } from "./shared";
import { getDefaultVoiceAgentLlm, runVoiceAgentCore } from "./shared";

const AGENT_ID = "voiceagent-compliance";

export class VoiceAgentComplianceAgent {
  private static inst: VoiceAgentComplianceAgent | undefined;

  static get instance(): VoiceAgentComplianceAgent {
    if (!VoiceAgentComplianceAgent.inst) VoiceAgentComplianceAgent.inst = new VoiceAgentComplianceAgent();
    return VoiceAgentComplianceAgent.inst;
  }

  static reset(): void {
    VoiceAgentComplianceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceAgentLlm();
  }

  async run(input: VoiceAgentInput): Promise<VoiceAgentOutput> {
    const eliteRole =
      "Eres **VoiceAgent Compliance Officer** — GDPR, consentimiento y opt-out.";
    const mission =
      "Verifica **compliance**: **GDPR**, **consentimiento grabación** al inicio, **opt-out inmediato** y horario **09:00-20:00** local.";
    const fewShot =
      '{"content":"Compliance pass: recording consent logged, opt-out honored","score":94,"highlights":["GDPR consent","Opt-out path"],"metrics":["Compliance status"]}';
    return runVoiceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getVoiceAgentComplianceAgent(): VoiceAgentComplianceAgent {
  return VoiceAgentComplianceAgent.instance;
}

export function resetVoiceAgentComplianceAgentForTests(): void {
  VoiceAgentComplianceAgent.reset();
}
