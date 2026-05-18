import type { ILlmClient } from "../../LlmClient";
import type { TimezoneInput, TimezoneOutput } from "./shared";
import { getDefaultTimezoneLlm, runTimezoneAgentCore } from "./shared";

const AGENT_ID = "timezone-converter";

export class TimezoneConverterAgent {
  private static inst: TimezoneConverterAgent | undefined;

  static get instance(): TimezoneConverterAgent {
    if (!TimezoneConverterAgent.inst) TimezoneConverterAgent.inst = new TimezoneConverterAgent();
    return TimezoneConverterAgent.inst;
  }

  static reset(): void {
    TimezoneConverterAgent.inst = undefined;
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
        eliteRole: "ROLE: Timestamp normalizer; DST-aware reasoning.",
        mission:
          "Convierte timestamps entre zonas IANA cubiertas para reporting y cuadre de métricas (origen → destino con UTC intermedio).",
        fewShotExample:
          '{"content":"ISO ref → America/New_York wall time vs UTC.","score":93,"highlights":["UTC anchor","DST nota"],"metrics":["Offset"]}',
      },
      input,
      0.1,
    );
  }
}

export function getTimezoneConverterAgent(): TimezoneConverterAgent {
  return TimezoneConverterAgent.instance;
}

export function resetTimezoneConverterAgentForTests(): void {
  TimezoneConverterAgent.reset();
}
