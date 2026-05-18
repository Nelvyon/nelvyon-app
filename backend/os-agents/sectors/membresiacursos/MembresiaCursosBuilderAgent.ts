import type { ILlmClient } from "../../LlmClient";
import type { MembresiaCursosInput, MembresiaCursosOutput } from "./shared";
import { getDefaultMembresiaCursosLlm, runMembresiaCursosAgentCore } from "./shared";

const AGENT_ID = "membresiacursos-builder";

export class MembresiaCursosBuilderAgent {
  private static inst: MembresiaCursosBuilderAgent | undefined;

  static get instance(): MembresiaCursosBuilderAgent {
    if (!MembresiaCursosBuilderAgent.inst) MembresiaCursosBuilderAgent.inst = new MembresiaCursosBuilderAgent();
    return MembresiaCursosBuilderAgent.inst;
  }

  static reset(): void {
    MembresiaCursosBuilderAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembresiaCursosLlm();
  }

  async run(input: MembresiaCursosInput): Promise<MembresiaCursosOutput> {
    const eliteRole = "Eres **MembresiaCursos Builder** — constructor de cursos y membresías.";
    const mission =
      "Construye **módulos**, **lecciones**, **quizzes** y **certificados automáticos**; curso completo **<10 min**.";
    const fewShot =
      '{"content":"Builder: módulos, lecciones, quizzes, certificados auto, <10 min","score":92,"highlights":["Módulos","<10 min"],"metrics":["Course build time"]}';
    return runMembresiaCursosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getMembresiaCursosBuilderAgent(): MembresiaCursosBuilderAgent {
  return MembresiaCursosBuilderAgent.instance;
}

export function resetMembresiaCursosBuilderAgentForTests(): void {
  MembresiaCursosBuilderAgent.reset();
}
