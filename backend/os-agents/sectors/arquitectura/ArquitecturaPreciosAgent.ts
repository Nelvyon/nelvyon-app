import type { ILlmClient } from "../../LlmClient";
import type { ArquitecturaInput, ArquitecturaOutput } from "./shared";
import { getDefaultArquitecturaLlm, runArquitecturaAgentCore } from "./shared";

const AGENT_ID = "arquitectura-precios";

let inst: ArquitecturaPreciosAgent | null = null;

export class ArquitecturaPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArquitecturaPreciosAgent {
    if (!inst) inst = new ArquitecturaPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArquitecturaLlm();
  }

  async run(input: ArquitecturaInput): Promise<ArquitecturaOutput> {
    const eliteRole = "Eres **Arquitectura Precios** — honorarios y proyectos.";
    const mission =
      "Diseña **pricing de proyectos** y **honorarios** (por fase, m², fee fijo + variable, extras).";
    const fewShot =
      '{"result":"Tabla fases + suplementos","score":91,"recommendations":["Anticipo fase 0","Visita técnica aparte"]}';
    return runArquitecturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArquitecturaPreciosAgent(): ArquitecturaPreciosAgent {
  return ArquitecturaPreciosAgent.instance();
}

export function resetArquitecturaPreciosAgentForTests(): void {
  inst = null;
}
