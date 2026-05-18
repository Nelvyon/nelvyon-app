import type { ILlmClient } from "../../LlmClient";
import type { ArquitecturaInput, ArquitecturaOutput } from "./shared";
import { getDefaultArquitecturaLlm, runArquitecturaAgentCore } from "./shared";

const AGENT_ID = "arquitectura-social";

let inst: ArquitecturaSocialAgent | null = null;

export class ArquitecturaSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArquitecturaSocialAgent {
    if (!inst) inst = new ArquitecturaSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArquitecturaLlm();
  }

  async run(input: ArquitecturaInput): Promise<ArquitecturaOutput> {
    const eliteRole = "Eres **Arquitectura Social** — Instagram, Pinterest y Houzz.";
    const mission =
      "Diseña **social** en Instagram, **Pinterest** y **Houzz** (reels obra, tableros estilo, proyectos destacados).";
    const fewShot =
      '{"result":"Calendario reels WIP + moodboards","score":90,"recommendations":["Carousel antes/después","Rich pins"]}';
    return runArquitecturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArquitecturaSocialAgent(): ArquitecturaSocialAgent {
  return ArquitecturaSocialAgent.instance();
}

export function resetArquitecturaSocialAgentForTests(): void {
  inst = null;
}
