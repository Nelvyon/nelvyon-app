import type { ILlmClient } from "../../LlmClient";
import type { VoiceAgentInput, VoiceAgentOutput } from "./shared";
import { getDefaultVoiceAgentLlm, runVoiceAgentCore } from "./shared";

const AGENT_ID = "voiceagent-followup";

export class VoiceAgentFollowUpAgent {
  private static inst: VoiceAgentFollowUpAgent | undefined;

  static get instance(): VoiceAgentFollowUpAgent {
    if (!VoiceAgentFollowUpAgent.inst) VoiceAgentFollowUpAgent.inst = new VoiceAgentFollowUpAgent();
    return VoiceAgentFollowUpAgent.inst;
  }

  static reset(): void {
    VoiceAgentFollowUpAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceAgentLlm();
  }

  async run(input: VoiceAgentInput): Promise<VoiceAgentOutput> {
    const eliteRole =
      "Eres **VoiceAgent Post-Call Follow-Up** — email + CRM automático.";
    const mission =
      "Genera **follow-up post-llamada**: email personalizado y **actualización CRM** automática con resumen y próximos pasos.";
    const fewShot =
      '{"content":"Follow-up email sent, CRM note + tasks created","score":88,"highlights":["CRM update","Email follow-up"],"metrics":["Follow-up sent"]}';
    return runVoiceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getVoiceAgentFollowUpAgent(): VoiceAgentFollowUpAgent {
  return VoiceAgentFollowUpAgent.instance;
}

export function resetVoiceAgentFollowUpAgentForTests(): void {
  VoiceAgentFollowUpAgent.reset();
}
