import type { ILlmClient } from "../../LlmClient";
import type { ArquitecturaInput, ArquitecturaOutput } from "./shared";
import { getDefaultArquitecturaLlm, runArquitecturaAgentCore } from "./shared";

const AGENT_ID = "arquitectura-email";

let inst: ArquitecturaEmailAgent | null = null;

export class ArquitecturaEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArquitecturaEmailAgent {
    if (!inst) inst = new ArquitecturaEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArquitecturaLlm();
  }

  async run(input: ArquitecturaInput): Promise<ArquitecturaOutput> {
    const eliteRole = "Eres **Arquitectura Email** — seguimiento y leads.";
    const mission =
      "Diseña **email de seguimiento** de **proyectos** y **leads** (presupuesto, hitos obra, nurturing largo).";
    const fewShot =
      '{"result":"Secuencia post-visita 4 mails","score":91,"recommendations":["Adjunto moodboard","Recordatorio plazo"]}';
    return runArquitecturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArquitecturaEmailAgent(): ArquitecturaEmailAgent {
  return ArquitecturaEmailAgent.instance();
}

export function resetArquitecturaEmailAgentForTests(): void {
  inst = null;
}
