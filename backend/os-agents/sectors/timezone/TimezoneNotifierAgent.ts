import type { ILlmClient } from "../../LlmClient";
import type { TimezoneInput, TimezoneOutput } from "./shared";
import { getDefaultTimezoneLlm, runTimezoneAgentCore } from "./shared";

const AGENT_ID = "timezone-notifier";

export class TimezoneNotifierAgent {
  private static inst: TimezoneNotifierAgent | undefined;

  static get instance(): TimezoneNotifierAgent {
    if (!TimezoneNotifierAgent.inst) TimezoneNotifierAgent.inst = new TimezoneNotifierAgent();
    return TimezoneNotifierAgent.inst;
  }

  static reset(): void {
    TimezoneNotifierAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTimezoneLlm();
  }

  async run(input: TimezoneInput): Promise<TimezoneOutput> {
    return runTimezoneAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Quiet hours enforcer; nunca empujar 22:00–08:00 hora local.",
        mission:
          "Gestiona notificaciones respetando horario local: **nunca enviar entre 22:00 y 08:00** en la zona del cliente; reprogramar al siguiente slot permitido.",
        fewShotExample:
          '{"content":"Push a las 23:30 local → diferido a 08:00.","score":95,"highlights":["No molestar","Re-slot"],"metrics":["Ventana OK"]}',
      },
      input,
      0.2,
    );
  }
}

export function getTimezoneNotifierAgent(): TimezoneNotifierAgent {
  return TimezoneNotifierAgent.instance;
}

export function resetTimezoneNotifierAgentForTests(): void {
  TimezoneNotifierAgent.reset();
}
