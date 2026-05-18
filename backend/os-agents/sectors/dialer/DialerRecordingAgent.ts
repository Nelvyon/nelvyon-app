import type { ILlmClient } from "../../LlmClient";
import type { DialerInput, DialerOutput } from "./shared";
import { getDefaultDialerLlm, runDialerAgentCore } from "./shared";

const AGENT_ID = "dialer-recording";

export class DialerRecordingAgent {
  private static inst: DialerRecordingAgent | undefined;

  static get instance(): DialerRecordingAgent {
    if (!DialerRecordingAgent.inst) DialerRecordingAgent.inst = new DialerRecordingAgent();
    return DialerRecordingAgent.inst;
  }

  static reset(): void {
    DialerRecordingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDialerLlm();
  }

  async run(input: DialerInput): Promise<DialerOutput> {
    const eliteRole = "Eres **Dialer Recording** — grabación y compliance legal.";
    const mission =
      "Gestiona **grabación**, **almacenamiento** y **compliance legal por país** en **195 países** automático.";
    const fewShot =
      '{"content":"Recording: grabación, storage, compliance 195 países","score":92,"highlights":["195 países","Compliance auto"],"metrics":["Recording compliance"]}';
    return runDialerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getDialerRecordingAgent(): DialerRecordingAgent {
  return DialerRecordingAgent.instance;
}

export function resetDialerRecordingAgentForTests(): void {
  DialerRecordingAgent.reset();
}
