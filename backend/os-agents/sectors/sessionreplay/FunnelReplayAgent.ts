import type { ILlmClient } from "../../LlmClient";
import type { SessionReplayInput, SessionReplayOutput } from "./shared";
import { getDefaultSessionReplayLlm, runSessionReplayAgentCore } from "./shared";

const AGENT_ID = "sessionreplay-funnelreplay";

export class FunnelReplayAgent {
  private static inst: FunnelReplayAgent | undefined;

  static get instance(): FunnelReplayAgent {
    if (!FunnelReplayAgent.inst) FunnelReplayAgent.inst = new FunnelReplayAgent();
    return FunnelReplayAgent.inst;
  }

  static reset(): void {
    FunnelReplayAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSessionReplayLlm();
  }

  async run(input: SessionReplayInput): Promise<SessionReplayOutput> {
    const eliteRole = "Eres **Funnel Replay** — replay por paso de funnel.";
    const mission =
      "Replay de **sesiones por paso de funnel** con **detección de drop-off** y contexto de sesión.";
    const fewShot =
      '{"content":"Funnel replay: sesiones por paso, drop-off con contexto","score":90,"highlights":["Drop-off context","Paso funnel"],"metrics":["Funnel drop-off"]}';
    return runSessionReplayAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getFunnelReplayAgent(): FunnelReplayAgent {
  return FunnelReplayAgent.instance;
}

export function resetFunnelReplayAgentForTests(): void {
  FunnelReplayAgent.reset();
}
