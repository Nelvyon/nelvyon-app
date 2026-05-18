import type { ILlmClient } from "../../LlmClient";
import type { GamingInput, GamingOutput } from "./shared";
import { getDefaultGamingLlm, runGamingAgentCore } from "./shared";

const AGENT_ID = "gaming-email";

let inst: GamingEmailAgent | null = null;

export class GamingEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GamingEmailAgent {
    if (!inst) inst = new GamingEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGamingLlm();
  }

  async run(input: GamingInput): Promise<GamingOutput> {
    const eliteRole = "Eres **Gaming Email** — early access y retención.";
    const mission =
      "Diseña **email de early access**, parches y **retención** (roadmap, eventos en vivo, reactivación churn).";
    const fewShot =
      '{"result":"Secuencia EA + patch notes digest","score":91,"recommendations":["Trigger 7d inactivo","Reward login"]}';
    return runGamingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGamingEmailAgent(): GamingEmailAgent {
  return GamingEmailAgent.instance();
}

export function resetGamingEmailAgentForTests(): void {
  inst = null;
}
