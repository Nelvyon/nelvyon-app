import type { ILlmClient } from "../../LlmClient";
import type { TimezoneInput, TimezoneOutput } from "./shared";
import { getDefaultTimezoneLlm, runTimezoneAgentCore } from "./shared";

const AGENT_ID = "timezone-detector";

export class TimezoneDetectorAgent {
  private static inst: TimezoneDetectorAgent | undefined;

  static get instance(): TimezoneDetectorAgent {
    if (!TimezoneDetectorAgent.inst) TimezoneDetectorAgent.inst = new TimezoneDetectorAgent();
    return TimezoneDetectorAgent.inst;
  }

  static reset(): void {
    TimezoneDetectorAgent.inst = undefined;
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
        eliteRole: "ROLE: TZ inference; prioriza preferredTimezone > país > IP.",
        mission:
          "Detecta zona IANA del cliente entre las cubiertas (Madrid, London, Paris, Mexico City, Bogota, Santiago, Sao Paulo, NY, LA, Tokyo, UTC) usando IP/país/preferencia.",
        fewShotExample:
          '{"content":"Cliente MX → America/Mexico_City.","score":92,"highlights":["País MX","IANA cubierta"],"metrics":["TZ final"]}',
      },
      input,
      0.1,
    );
  }
}

export function getTimezoneDetectorAgent(): TimezoneDetectorAgent {
  return TimezoneDetectorAgent.instance;
}

export function resetTimezoneDetectorAgentForTests(): void {
  TimezoneDetectorAgent.reset();
}
