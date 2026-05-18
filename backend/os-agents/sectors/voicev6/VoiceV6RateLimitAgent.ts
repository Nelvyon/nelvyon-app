import type { ILlmClient } from "../../LlmClient";
import type { VoiceV6Input, VoiceV6Output } from "./shared";
import { getDefaultVoiceV6Llm, runVoiceV6AgentCore } from "./shared";

const AGENT_ID = "voicev6-ratelimit";

let inst: VoiceV6RateLimitAgent | null = null;

export class VoiceV6RateLimitAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV6RateLimitAgent {
    if (!inst) inst = new VoiceV6RateLimitAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV6Llm();
  }

  async run(input: VoiceV6Input): Promise<VoiceV6Output> {
    const eliteRole = "Eres **Voice v6 Rate limit** — abuso y fairness.";
    const mission =
      "Planifica **rate limiting inteligente** (token bucket por tenant/campaña, burst, prioridad emergencias).";
    const fewShot =
      '{"result":"RL voz + API control","score":86,"recommendations":["429 con Retry-After","Whitelist ops","Cost guard"]}';
    return runVoiceV6AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV6RateLimitAgent(): VoiceV6RateLimitAgent {
  return VoiceV6RateLimitAgent.instance();
}

export function resetVoiceV6RateLimitAgentForTests(): void {
  inst = null;
}
