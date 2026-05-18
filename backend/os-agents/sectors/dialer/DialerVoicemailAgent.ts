import type { ILlmClient } from "../../LlmClient";
import type { DialerInput, DialerOutput } from "./shared";
import { getDefaultDialerLlm, runDialerAgentCore } from "./shared";

const AGENT_ID = "dialer-voicemail";

export class DialerVoicemailAgent {
  private static inst: DialerVoicemailAgent | undefined;

  static get instance(): DialerVoicemailAgent {
    if (!DialerVoicemailAgent.inst) DialerVoicemailAgent.inst = new DialerVoicemailAgent();
    return DialerVoicemailAgent.inst;
  }

  static reset(): void {
    DialerVoicemailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDialerLlm();
  }

  async run(input: DialerInput): Promise<DialerOutput> {
    const eliteRole = "Eres **Dialer Voicemail** — buzón y mensajes personalizados.";
    const mission =
      "Deja **voicemails personalizados automáticos** con **detección de buzón** para maximizar connect rate **>35%**.";
    const fewShot =
      '{"content":"Voicemail: personalizado auto, detección buzón, >35% connect","score":88,"highlights":["Detección buzón","VM personalizado"],"metrics":["Voicemail connect"]}';
    return runDialerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.55);
  }
}

export function getDialerVoicemailAgent(): DialerVoicemailAgent {
  return DialerVoicemailAgent.instance;
}

export function resetDialerVoicemailAgentForTests(): void {
  DialerVoicemailAgent.reset();
}
