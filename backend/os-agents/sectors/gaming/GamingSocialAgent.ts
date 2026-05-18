import type { ILlmClient } from "../../LlmClient";
import type { GamingInput, GamingOutput } from "./shared";
import { getDefaultGamingLlm, runGamingAgentCore } from "./shared";

const AGENT_ID = "gaming-social";

let inst: GamingSocialAgent | null = null;

export class GamingSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GamingSocialAgent {
    if (!inst) inst = new GamingSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGamingLlm();
  }

  async run(input: GamingInput): Promise<GamingOutput> {
    const eliteRole = "Eres **Gaming Social** — TikTok, YouTube, Twitch.";
    const mission =
      "Diseña **social** en TikTok, YouTube y Twitch con **clips virales**, shorts y colaboraciones con creadores.";
    const fewShot =
      '{"result":"Formato clip 15s + highlight reel","score":90,"recommendations":["Hook primer frame","Collab streamer micro"]}';
    return runGamingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGamingSocialAgent(): GamingSocialAgent {
  return GamingSocialAgent.instance();
}

export function resetGamingSocialAgentForTests(): void {
  inst = null;
}
