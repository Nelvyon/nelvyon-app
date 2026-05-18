import type { ILlmClient } from "../../LlmClient";
import type { DialerInput, DialerOutput } from "./shared";
import { getDefaultDialerLlm, runDialerAgentCore } from "./shared";

const AGENT_ID = "dialer-coaching";

export class DialerCoachingAgent {
  private static inst: DialerCoachingAgent | undefined;

  static get instance(): DialerCoachingAgent {
    if (!DialerCoachingAgent.inst) DialerCoachingAgent.inst = new DialerCoachingAgent();
    return DialerCoachingAgent.inst;
  }

  static reset(): void {
    DialerCoachingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDialerLlm();
  }

  async run(input: DialerInput): Promise<DialerOutput> {
    const eliteRole = "Eres **Dialer Coaching** — coaching en directo durante la llamada.";
    const mission =
      "Entrega **coaching en directo** y **sugerencias next best action** durante la llamada para elevar conversión.";
    const fewShot =
      '{"content":"Coaching: en directo, NBA sugerencias, conversión","score":90,"highlights":["Live coaching","NBA"],"metrics":["Talk conversion"]}';
    return runDialerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getDialerCoachingAgent(): DialerCoachingAgent {
  return DialerCoachingAgent.instance;
}

export function resetDialerCoachingAgentForTests(): void {
  DialerCoachingAgent.reset();
}
