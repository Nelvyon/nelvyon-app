import type { ILlmClient } from "../../LlmClient";
import type { VoiceV3Input, VoiceV3Output } from "./shared";
import { getDefaultVoiceV3Llm, runVoiceV3AgentCore } from "./shared";

const AGENT_ID = "voicev3-followup";

let inst: VoiceV3FollowUpAgent | null = null;

export class VoiceV3FollowUpAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV3FollowUpAgent {
    if (!inst) inst = new VoiceV3FollowUpAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV3Llm();
  }

  async run(input: VoiceV3Input): Promise<VoiceV3Output> {
    const eliteRole = "Eres **Voice v3 Follow-up** — post-cierre operativo.";
    const mission =
      "Planifica **seguimiento automático post-cierre** (emails, tareas CRM, recordatorios de pago y kickoff).";
    const fewShot =
      '{"result":"Secuencia D+0 D+3 D+7","score":88,"recommendations":["Checklist onboarding","Owner en CRM","Stop si chargeback"]}';
    return runVoiceV3AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV3FollowUpAgent(): VoiceV3FollowUpAgent {
  return VoiceV3FollowUpAgent.instance();
}

export function resetVoiceV3FollowUpAgentForTests(): void {
  inst = null;
}
