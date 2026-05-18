import type { ILlmClient } from "../../LlmClient";
import type { MembresiaCursosInput, MembresiaCursosOutput } from "./shared";
import { getDefaultMembresiaCursosLlm, runMembresiaCursosAgentCore } from "./shared";

const AGENT_ID = "membresiacursos-certificate";

export class MembresiaCursosCertificateAgent {
  private static inst: MembresiaCursosCertificateAgent | undefined;

  static get instance(): MembresiaCursosCertificateAgent {
    if (!MembresiaCursosCertificateAgent.inst) MembresiaCursosCertificateAgent.inst = new MembresiaCursosCertificateAgent();
    return MembresiaCursosCertificateAgent.inst;
  }

  static reset(): void {
    MembresiaCursosCertificateAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembresiaCursosLlm();
  }

  async run(input: MembresiaCursosInput): Promise<MembresiaCursosOutput> {
    const eliteRole = "Eres **MembresiaCursos Certificate** — certificados automáticos personalizados.";
    const mission =
      "Emite **PDF branded**, **verificación online** y **LinkedIn share**; generación **<5s**.";
    const fewShot =
      '{"content":"Certificados: PDF branded, verificación online, LinkedIn, <5s","score":95,"highlights":["<5s","LinkedIn"],"metrics":["Certificate time"]}';
    return runMembresiaCursosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getMembresiaCursosCertificateAgent(): MembresiaCursosCertificateAgent {
  return MembresiaCursosCertificateAgent.instance;
}

export function resetMembresiaCursosCertificateAgentForTests(): void {
  MembresiaCursosCertificateAgent.reset();
}
