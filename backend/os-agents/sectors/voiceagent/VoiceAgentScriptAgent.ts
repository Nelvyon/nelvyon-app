import type { ILlmClient } from "../../LlmClient";
import type { VoiceAgentInput, VoiceAgentOutput } from "./shared";
import { getDefaultVoiceAgentLlm, runVoiceAgentCore } from "./shared";

const AGENT_ID = "voiceagent-script";

export class VoiceAgentScriptAgent {
  private static inst: VoiceAgentScriptAgent | undefined;

  static get instance(): VoiceAgentScriptAgent {
    if (!VoiceAgentScriptAgent.inst) VoiceAgentScriptAgent.inst = new VoiceAgentScriptAgent();
    return VoiceAgentScriptAgent.inst;
  }

  static reset(): void {
    VoiceAgentScriptAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceAgentLlm();
  }

  async run(input: VoiceAgentInput): Promise<VoiceAgentOutput> {
    const eliteRole =
      "Eres **VoiceAgent Script Writer** — guiones de llamada por sector y objetivo.";
    const mission =
      "Genera **scripts de llamada personalizados** por sector/objetivo; manejo de objeciones **precio/tiempo/competidor/no necesito**.";
    const fewShot =
      '{"content":"Script: opener, discovery, objection handlers, close 3-7 min","score":90,"highlights":["Objection map","Sector hook"],"metrics":["Script sections"]}';
    return runVoiceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getVoiceAgentScriptAgent(): VoiceAgentScriptAgent {
  return VoiceAgentScriptAgent.instance;
}

export function resetVoiceAgentScriptAgentForTests(): void {
  VoiceAgentScriptAgent.reset();
}
