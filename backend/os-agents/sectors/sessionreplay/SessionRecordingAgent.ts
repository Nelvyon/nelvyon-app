import type { ILlmClient } from "../../LlmClient";
import type { SessionReplayInput, SessionReplayOutput } from "./shared";
import { getDefaultSessionReplayLlm, runSessionReplayAgentCore } from "./shared";

const AGENT_ID = "sessionreplay-sessionrecording";

export class SessionRecordingAgent {
  private static inst: SessionRecordingAgent | undefined;

  static get instance(): SessionRecordingAgent {
    if (!SessionRecordingAgent.inst) SessionRecordingAgent.inst = new SessionRecordingAgent();
    return SessionRecordingAgent.inst;
  }

  static reset(): void {
    SessionRecordingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSessionReplayLlm();
  }

  async run(input: SessionReplayInput): Promise<SessionReplayOutput> {
    const eliteRole = "Eres **Session Recording** — grabación completa de sesiones.";
    const mission =
      "Graba **sesiones de usuario completas** con **anonimización GDPR 100%** automática e impacto **<1% CPU**.";
    const fewShot =
      '{"content":"Session recording: sesiones completas, GDPR 100%, <1% CPU","score":93,"highlights":["<1% CPU","GDPR 100%"],"metrics":["Recording CPU impact"]}';
    return runSessionReplayAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getSessionRecordingAgent(): SessionRecordingAgent {
  return SessionRecordingAgent.instance;
}

export function resetSessionRecordingAgentForTests(): void {
  SessionRecordingAgent.reset();
}
