import type { ILlmClient } from "../../LlmClient";
import type { TimezoneInput, TimezoneOutput } from "./shared";
import { getDefaultTimezoneLlm, runTimezoneAgentCore } from "./shared";

const AGENT_ID = "timezone-optimal";

export class TimezoneOptimalAgent {
  private static inst: TimezoneOptimalAgent | undefined;

  static get instance(): TimezoneOptimalAgent {
    if (!TimezoneOptimalAgent.inst) TimezoneOptimalAgent.inst = new TimezoneOptimalAgent();
    return TimezoneOptimalAgent.inst;
  }

  static reset(): void {
    TimezoneOptimalAgent.inst = undefined;
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
        eliteRole: "ROLE: Send-time optimizer by vertical; open rate proxy.",
        mission:
          "Calcula mejor hora de envío en **hora local** según sector/país: restaurantes 11h y 18h, ecommerce 20h, B2B 9h y 14h, coaches 7h y 19h.",
        fewShotExample:
          '{"content":"Sector retail ecommerce → ventana 20:00 local.","score":88,"highlights":["Ecommerce 20h","IANA cliente"],"metrics":["Slot A/B"]}',
      },
      input,
      0.2,
    );
  }
}

export function getTimezoneOptimalAgent(): TimezoneOptimalAgent {
  return TimezoneOptimalAgent.instance;
}

export function resetTimezoneOptimalAgentForTests(): void {
  TimezoneOptimalAgent.reset();
}
