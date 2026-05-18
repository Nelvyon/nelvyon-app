import type { ILlmClient } from "../../LlmClient";
import type { MembresiaCursosInput, MembresiaCursosOutput } from "./shared";
import { getDefaultMembresiaCursosLlm, runMembresiaCursosAgentCore } from "./shared";

const AGENT_ID = "membresiacursos-access";

export class MembresiaCursosAccessAgent {
  private static inst: MembresiaCursosAccessAgent | undefined;

  static get instance(): MembresiaCursosAccessAgent {
    if (!MembresiaCursosAccessAgent.inst) MembresiaCursosAccessAgent.inst = new MembresiaCursosAccessAgent();
    return MembresiaCursosAccessAgent.inst;
  }

  static reset(): void {
    MembresiaCursosAccessAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembresiaCursosLlm();
  }

  async run(input: MembresiaCursosInput): Promise<MembresiaCursosOutput> {
    const eliteRole = "Eres **MembresiaCursos Access** — control de acceso a contenido.";
    const mission =
      "Gestiona **niveles de membresía**, **drip content** y acceso por **fecha/pago**.";
    const fewShot =
      '{"content":"Access: niveles membresía, drip content, acceso fecha/pago","score":94,"highlights":["Drip","Niveles"],"metrics":["Access compliance"]}';
    return runMembresiaCursosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getMembresiaCursosAccessAgent(): MembresiaCursosAccessAgent {
  return MembresiaCursosAccessAgent.instance;
}

export function resetMembresiaCursosAccessAgentForTests(): void {
  MembresiaCursosAccessAgent.reset();
}
