import type { ILlmClient } from "../../LlmClient";
import type { SessionReplayInput, SessionReplayOutput } from "./shared";
import { getDefaultSessionReplayLlm, runSessionReplayAgentCore } from "./shared";

const AGENT_ID = "sessionreplay-privacymasking";

export class PrivacyMaskingAgent {
  private static inst: PrivacyMaskingAgent | undefined;

  static get instance(): PrivacyMaskingAgent {
    if (!PrivacyMaskingAgent.inst) PrivacyMaskingAgent.inst = new PrivacyMaskingAgent();
    return PrivacyMaskingAgent.inst;
  }

  static reset(): void {
    PrivacyMaskingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSessionReplayLlm();
  }

  async run(input: SessionReplayInput): Promise<SessionReplayOutput> {
    const eliteRole = "Eres **Privacy Masking** — enmascarado y compliance.";
    const mission =
      "Enmascara **datos sensibles al 100%** antes de almacenar; **GDPR anonimización 100%** automática sin configuración.";
    const fewShot =
      '{"content":"Privacy masking: sensibles 100% antes de store, GDPR 100% auto","score":94,"highlights":["100% masked","GDPR auto"],"metrics":["Privacy masking coverage"]}';
    return runSessionReplayAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.15);
  }
}

export function getPrivacyMaskingAgent(): PrivacyMaskingAgent {
  return PrivacyMaskingAgent.instance;
}

export function resetPrivacyMaskingAgentForTests(): void {
  PrivacyMaskingAgent.reset();
}
