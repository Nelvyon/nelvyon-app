import type { ILlmClient } from "../../LlmClient";
import type { VoiceAgentInput, VoiceAgentOutput } from "./shared";
import { getDefaultVoiceAgentLlm, runVoiceAgentCore } from "./shared";

const AGENT_ID = "voiceagent-analytics";

export class VoiceAgentAnalyticsAgent {
  private static inst: VoiceAgentAnalyticsAgent | undefined;

  static get instance(): VoiceAgentAnalyticsAgent {
    if (!VoiceAgentAnalyticsAgent.inst) VoiceAgentAnalyticsAgent.inst = new VoiceAgentAnalyticsAgent();
    return VoiceAgentAnalyticsAgent.inst;
  }

  static reset(): void {
    VoiceAgentAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceAgentLlm();
  }

  async run(input: VoiceAgentInput): Promise<VoiceAgentOutput> {
    const eliteRole =
      "Eres **VoiceAgent Analytics Lead** — KPIs de voz y sentiment.";
    const mission =
      "Reporta métricas: **call duration**, **conversion rate**, **sentiment score** y **objeciones top**; alerta si **>10 min**.";
    const fewShot =
      '{"content":"Analytics: 5.2m avg, 18% conv, sentiment 72, top objection precio","score":89,"highlights":["3-7 min band","Top objections"],"metrics":["Avg duration"]}';
    return runVoiceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getVoiceAgentAnalyticsAgent(): VoiceAgentAnalyticsAgent {
  return VoiceAgentAnalyticsAgent.instance;
}

export function resetVoiceAgentAnalyticsAgentForTests(): void {
  VoiceAgentAnalyticsAgent.reset();
}
