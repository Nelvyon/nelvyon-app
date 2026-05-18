import type { ILlmClient } from "../../LlmClient";
import type { MembresiaCursosInput, MembresiaCursosOutput } from "./shared";
import { getDefaultMembresiaCursosLlm, runMembresiaCursosAgentCore } from "./shared";

const AGENT_ID = "membresiacursos-analytics";

export class MembresiaCursosAnalyticsAgent {
  private static inst: MembresiaCursosAnalyticsAgent | undefined;

  static get instance(): MembresiaCursosAnalyticsAgent {
    if (!MembresiaCursosAnalyticsAgent.inst) MembresiaCursosAnalyticsAgent.inst = new MembresiaCursosAnalyticsAgent();
    return MembresiaCursosAnalyticsAgent.inst;
  }

  static reset(): void {
    MembresiaCursosAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembresiaCursosLlm();
  }

  async run(input: MembresiaCursosInput): Promise<MembresiaCursosOutput> {
    const eliteRole = "Eres **MembresiaCursos Analytics** — analytics de cursos y alumnos.";
    const mission =
      "Mide **LTV alumno**, **completion rate**, **NPS** y **revenue por curso** en tiempo real.";
    const fewShot =
      '{"content":"Analytics: LTV alumno, completion, NPS, revenue curso RT","score":94,"highlights":["LTV","NPS"],"metrics":["Course LTV"]}';
    return runMembresiaCursosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getMembresiaCursosAnalyticsAgent(): MembresiaCursosAnalyticsAgent {
  return MembresiaCursosAnalyticsAgent.instance;
}

export function resetMembresiaCursosAnalyticsAgentForTests(): void {
  MembresiaCursosAnalyticsAgent.reset();
}
