import type { ILlmClient } from "../../LlmClient";
import type { DialerInput, DialerOutput } from "./shared";
import { getDefaultDialerLlm, runDialerAgentCore } from "./shared";

const AGENT_ID = "dialer-followup";

export class DialerFollowUpAgent {
  private static inst: DialerFollowUpAgent | undefined;

  static get instance(): DialerFollowUpAgent {
    if (!DialerFollowUpAgent.inst) DialerFollowUpAgent.inst = new DialerFollowUpAgent();
    return DialerFollowUpAgent.inst;
  }

  static reset(): void {
    DialerFollowUpAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDialerLlm();
  }

  async run(input: DialerInput): Promise<DialerOutput> {
    const eliteRole = "Eres **Dialer Follow-Up** — post-llamada automatizada.";
    const mission =
      "Ejecuta **tareas post-llamada**, **emails** y **CRM update** en **<30 segundos**; **0 tareas manuales** para el agente.";
    const fewShot =
      '{"content":"Follow-up: tareas auto, emails, CRM <30 s, 0 manual","score":91,"highlights":["CRM <30 s","0 manual"],"metrics":["Post-call CRM time"]}';
    return runDialerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getDialerFollowUpAgent(): DialerFollowUpAgent {
  return DialerFollowUpAgent.instance;
}

export function resetDialerFollowUpAgentForTests(): void {
  DialerFollowUpAgent.reset();
}
