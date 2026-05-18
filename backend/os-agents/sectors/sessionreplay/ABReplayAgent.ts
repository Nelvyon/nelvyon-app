import type { ILlmClient } from "../../LlmClient";
import type { SessionReplayInput, SessionReplayOutput } from "./shared";
import { getDefaultSessionReplayLlm, runSessionReplayAgentCore } from "./shared";

const AGENT_ID = "sessionreplay-abreplay";

export class ABReplayAgent {
  private static inst: ABReplayAgent | undefined;

  static get instance(): ABReplayAgent {
    if (!ABReplayAgent.inst) ABReplayAgent.inst = new ABReplayAgent();
    return ABReplayAgent.inst;
  }

  static reset(): void {
    ABReplayAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSessionReplayLlm();
  }

  async run(input: SessionReplayInput): Promise<SessionReplayOutput> {
    const eliteRole = "Eres **AB Replay** — comparativa visual A/B.";
    const mission =
      "Compara **sesiones entre variantes A/B** con **winner detection visual** desde replays.";
    const fewShot =
      '{"content":"AB replay: variantes A/B, winner detection visual","score":89,"highlights":["A/B compare","Winner visual"],"metrics":["AB winner detection"]}';
    return runSessionReplayAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getABReplayAgent(): ABReplayAgent {
  return ABReplayAgent.instance;
}

export function resetABReplayAgentForTests(): void {
  ABReplayAgent.reset();
}
