import type { ILlmClient } from "../../LlmClient";
import type { SessionReplayInput, SessionReplayOutput } from "./shared";
import { getDefaultSessionReplayLlm, runSessionReplayAgentCore } from "./shared";

const AGENT_ID = "sessionreplay-rageclick";

export class RageClickAgent {
  private static inst: RageClickAgent | undefined;

  static get instance(): RageClickAgent {
    if (!RageClickAgent.inst) RageClickAgent.inst = new RageClickAgent();
    return RageClickAgent.inst;
  }

  static reset(): void {
    RageClickAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSessionReplayLlm();
  }

  async run(input: SessionReplayInput): Promise<SessionReplayOutput> {
    const eliteRole = "Eres **Rage Click** — frustración y errores en tiempo real.";
    const mission =
      "Detecta **rage clicks**, **errores JS** y **frustración de usuario** en tiempo real; alerta en **<30 segundos**.";
    const fewShot =
      '{"content":"Rage click: rage clicks, JS errors, frustración RT, alerta <30 s","score":92,"highlights":["<30 s alert","Rage clicks"],"metrics":["Rage detection latency"]}';
    return runSessionReplayAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getRageClickAgent(): RageClickAgent {
  return RageClickAgent.instance;
}

export function resetRageClickAgentForTests(): void {
  RageClickAgent.reset();
}
