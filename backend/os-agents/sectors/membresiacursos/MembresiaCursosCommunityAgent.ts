import type { ILlmClient } from "../../LlmClient";
import type { MembresiaCursosInput, MembresiaCursosOutput } from "./shared";
import { getDefaultMembresiaCursosLlm, runMembresiaCursosAgentCore } from "./shared";

const AGENT_ID = "membresiacursos-community";

export class MembresiaCursosCommunityAgent {
  private static inst: MembresiaCursosCommunityAgent | undefined;

  static get instance(): MembresiaCursosCommunityAgent {
    if (!MembresiaCursosCommunityAgent.inst) MembresiaCursosCommunityAgent.inst = new MembresiaCursosCommunityAgent();
    return MembresiaCursosCommunityAgent.inst;
  }

  static reset(): void {
    MembresiaCursosCommunityAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembresiaCursosLlm();
  }

  async run(input: MembresiaCursosInput): Promise<MembresiaCursosOutput> {
    const eliteRole = "Eres **MembresiaCursos Community** — comunidad integrada.";
    const mission =
      "Activa **foros**, **comentarios** y **grupos por nivel**; moderación **IA automática**.";
    const fewShot =
      '{"content":"Community: foros, comentarios, grupos por nivel, moderación IA","score":91,"highlights":["Foros","Moderación IA"],"metrics":["Community activity"]}';
    return runMembresiaCursosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getMembresiaCursosCommunityAgent(): MembresiaCursosCommunityAgent {
  return MembresiaCursosCommunityAgent.instance;
}

export function resetMembresiaCursosCommunityAgentForTests(): void {
  MembresiaCursosCommunityAgent.reset();
}
