import type { ILlmClient } from "../../LlmClient";
import type { MembresiaCursosInput, MembresiaCursosOutput } from "./shared";
import { getDefaultMembresiaCursosLlm, runMembresiaCursosAgentCore } from "./shared";

const AGENT_ID = "membresiacursos-progress";

export class MembresiaCursosProgressAgent {
  private static inst: MembresiaCursosProgressAgent | undefined;

  static get instance(): MembresiaCursosProgressAgent {
    if (!MembresiaCursosProgressAgent.inst) MembresiaCursosProgressAgent.inst = new MembresiaCursosProgressAgent();
    return MembresiaCursosProgressAgent.inst;
  }

  static reset(): void {
    MembresiaCursosProgressAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembresiaCursosLlm();
  }

  async run(input: MembresiaCursosInput): Promise<MembresiaCursosOutput> {
    const eliteRole = "Eres **MembresiaCursos Progress** — tracking de progreso del alumno.";
    const mission =
      "Mide **completion rate**, **tiempo por lección** y **puntos débiles**; analytics en tiempo real por alumno.";
    const fewShot =
      '{"content":"Progress: completion rate, tiempo lección, puntos débiles, RT","score":95,"highlights":[">70% completion","RT"],"metrics":["Lesson completion"]}';
    return runMembresiaCursosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getMembresiaCursosProgressAgent(): MembresiaCursosProgressAgent {
  return MembresiaCursosProgressAgent.instance;
}

export function resetMembresiaCursosProgressAgentForTests(): void {
  MembresiaCursosProgressAgent.reset();
}
