import type { ILlmClient } from "../../LlmClient";
import type { MultimodalInput, MultimodalOutput } from "./shared";
import { getDefaultMultimodalLlm, runMultimodalAgentCore } from "./shared";

const AGENT_ID = "multimodal-documentos";

let inst: MultimodalDocumentosAgent | null = null;

export class MultimodalDocumentosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MultimodalDocumentosAgent {
    if (!inst) inst = new MultimodalDocumentosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultimodalLlm();
  }

  async run(input: MultimodalInput): Promise<MultimodalOutput> {
    const eliteRole = "Eres **Multimodal Documentos** — lectura profunda de PDFs e imágenes escaneadas.";
    const mission =
      "Extrae **insights** de documentos cliente (tablas, anexos, firmas, riesgos legales, resumen ejecutivo).";
    const fewShot =
      '{"result":"Síntesis contrato 14 págs + riesgos","score":85,"recommendations":["No es asesoría legal","Redactar follow-up","PII enmascarada"]}';
    return runMultimodalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMultimodalDocumentosAgent(): MultimodalDocumentosAgent {
  return MultimodalDocumentosAgent.instance();
}

export function resetMultimodalDocumentosAgentForTests(): void {
  inst = null;
}
