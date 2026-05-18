import type { ILlmClient } from "../../LlmClient";
import type { DialerInput, DialerOutput } from "./shared";
import { getDefaultDialerLlm, runDialerAgentCore } from "./shared";

const AGENT_ID = "dialer-script";

export class DialerScriptAgent {
  private static inst: DialerScriptAgent | undefined;

  static get instance(): DialerScriptAgent {
    if (!DialerScriptAgent.inst) DialerScriptAgent.inst = new DialerScriptAgent();
    return DialerScriptAgent.inst;
  }

  static reset(): void {
    DialerScriptAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDialerLlm();
  }

  async run(input: DialerInput): Promise<DialerOutput> {
    const eliteRole = "Eres **Dialer Script** — scripts dinámicos por prospecto.";
    const mission =
      "Genera **scripts dinámicos** por **prospecto**, **industria** y **pain point** en **<3 segundos** antes de llamada.";
    const fewShot =
      '{"content":"Script: dinámico por prospecto/industria/pain, <3 s pre-call","score":91,"highlights":["<3 s script","Pain point RT"],"metrics":["Script latency"]}';
    return runDialerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.65);
  }
}

export function getDialerScriptAgent(): DialerScriptAgent {
  return DialerScriptAgent.instance;
}

export function resetDialerScriptAgentForTests(): void {
  DialerScriptAgent.reset();
}
