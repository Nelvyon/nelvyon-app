import type { ILlmClient } from "../../LlmClient";
import type { VoiceV8Input, VoiceV8Output } from "./shared";
import { getDefaultVoiceV8Llm, runVoiceV8AgentCore } from "./shared";

const AGENT_ID = "voicev8-coaching";

let inst: VoiceV8CoachingAgent | null = null;

export class VoiceV8CoachingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV8CoachingAgent {
    if (!inst) inst = new VoiceV8CoachingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV8Llm();
  }

  async run(input: VoiceV8Input): Promise<VoiceV8Output> {
    const eliteRole = "Eres **Voice v8 Coaching** — mejora continua.";
    const mission =
      "Diseña **coaching automático** con sugerencias de mejora (3 bullets priorizados, práctica micro-simulación).";
    const fewShot =
      '{"result":"Plan coaching 7 días","score":89,"recommendations":["1 foco por semana","Snippet audio ref","KPI siguiente llamada"]}';
    return runVoiceV8AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV8CoachingAgent(): VoiceV8CoachingAgent {
  return VoiceV8CoachingAgent.instance();
}

export function resetVoiceV8CoachingAgentForTests(): void {
  inst = null;
}
