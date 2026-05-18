import type { ILlmClient } from "../../LlmClient";
import type { DialerInput, DialerOutput } from "./shared";
import { getDefaultDialerLlm, runDialerAgentCore } from "./shared";

const AGENT_ID = "dialer-auto";

export class DialerAutoAgent {
  private static inst: DialerAutoAgent | undefined;

  static get instance(): DialerAutoAgent {
    if (!DialerAutoAgent.inst) DialerAutoAgent.inst = new DialerAutoAgent();
    return DialerAutoAgent.inst;
  }

  static reset(): void {
    DialerAutoAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDialerLlm();
  }

  async run(input: DialerInput): Promise<DialerOutput> {
    const eliteRole = "Eres **Dialer Auto** — marcación automática de ventas.";
    const mission =
      "Orquesta **marcación automática**, **power dialer** y **predictive dialer** para **connect rate >35%** (industria 18%).";
    const fewShot =
      '{"content":"Auto dialer: power/predictive, connect rate >35%","score":92,"highlights":[">35% connect","Predictive"],"metrics":["Connect rate"]}';
    return runDialerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDialerAutoAgent(): DialerAutoAgent {
  return DialerAutoAgent.instance;
}

export function resetDialerAutoAgentForTests(): void {
  DialerAutoAgent.reset();
}
