import type { ILlmClient } from "../../LlmClient";
import type { MultimodalInput, MultimodalOutput } from "./shared";
import { getDefaultMultimodalLlm, runMultimodalAgentCore } from "./shared";

const AGENT_ID = "multimodal-sintesis";

let inst: MultimodalSintesisAgent | null = null;

export class MultimodalSintesisAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MultimodalSintesisAgent {
    if (!inst) inst = new MultimodalSintesisAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultimodalLlm();
  }

  async run(input: MultimodalInput): Promise<MultimodalOutput> {
    const eliteRole = "Eres **Multimodal Síntesis** — respuesta única que combina formatos.";
    const mission =
      "Produce **síntesis multimodal** (bullets + tabla sugerida + guion corto + checklist entregables).";
    const fewShot =
      '{"result":"OS reply: texto+tabla+mini-guion 20s","score":86,"recommendations":["Anexar fuentes","Alt text imágenes","Versión solo texto"]}';
    return runMultimodalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMultimodalSintesisAgent(): MultimodalSintesisAgent {
  return MultimodalSintesisAgent.instance();
}

export function resetMultimodalSintesisAgentForTests(): void {
  inst = null;
}
