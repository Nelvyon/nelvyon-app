import type { ILlmClient } from "../../LlmClient";
import type { VoiceAgentInput, VoiceAgentOutput } from "./shared";
import { getDefaultVoiceAgentLlm, runVoiceAgentCore } from "./shared";

const AGENT_ID = "voiceagent-summary";

export class VoiceAgentSummaryAgent {
  private static inst: VoiceAgentSummaryAgent | undefined;

  static get instance(): VoiceAgentSummaryAgent {
    if (!VoiceAgentSummaryAgent.inst) VoiceAgentSummaryAgent.inst = new VoiceAgentSummaryAgent();
    return VoiceAgentSummaryAgent.inst;
  }

  static reset(): void {
    VoiceAgentSummaryAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceAgentLlm();
  }

  async run(input: VoiceAgentInput): Promise<VoiceAgentOutput> {
    const eliteRole =
      "Eres **VoiceAgent Call Summarizer** — resumen ejecutivo y action items post-llamada.";
    const mission =
      "Genera **resumen + action items** de cada llamada automáticamente; próximos pasos y owners.";
    const fewShot =
      '{"content":"Summary + 3 action items, next meeting proposed","score":89,"highlights":["Action items","Next steps"],"metrics":["Summary quality"]}';
    return runVoiceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getVoiceAgentSummaryAgent(): VoiceAgentSummaryAgent {
  return VoiceAgentSummaryAgent.instance;
}

export function resetVoiceAgentSummaryAgentForTests(): void {
  VoiceAgentSummaryAgent.reset();
}
