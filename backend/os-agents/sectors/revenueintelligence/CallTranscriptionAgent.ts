import type { ILlmClient } from "../../LlmClient";
import type { RevenueIntelligenceInput, RevenueIntelligenceOutput } from "./shared";
import { getDefaultRevenueIntelligenceLlm, runRevenueIntelligenceAgentCore } from "./shared";

const AGENT_ID = "revenueintelligence-calltranscription";

export class CallTranscriptionAgent {
  private static inst: CallTranscriptionAgent | undefined;

  static get instance(): CallTranscriptionAgent {
    if (!CallTranscriptionAgent.inst) CallTranscriptionAgent.inst = new CallTranscriptionAgent();
    return CallTranscriptionAgent.inst;
  }

  static reset(): void {
    CallTranscriptionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRevenueIntelligenceLlm();
  }

  async run(input: RevenueIntelligenceInput): Promise<RevenueIntelligenceOutput> {
    const eliteRole = "Eres **Call Transcription** — transcripción de llamadas de ventas.";
    const mission =
      "Transcribe llamadas de ventas en **tiempo real** con **<1 s de latencia** y soporte **40+ idiomas**.";
    const fewShot =
      '{"content":"Transcripción RT: <1 s latencia, 40+ idiomas, ventas","score":95,"highlights":["<1 s latencia","40+ idiomas"],"metrics":["Transcription latency"]}';
    return runRevenueIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getCallTranscriptionAgent(): CallTranscriptionAgent {
  return CallTranscriptionAgent.instance;
}

export function resetCallTranscriptionAgentForTests(): void {
  CallTranscriptionAgent.reset();
}
