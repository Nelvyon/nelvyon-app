import type { ILlmClient } from "../../LlmClient";
import type { ImagenesInput, ImagenesOutput } from "./shared";
import { getDefaultImagenesLlm, runImagenesAgentCore } from "./shared";

const AGENT_ID = "imagenes-producto";

let inst: ImagenesProductoAgent | null = null;

export class ImagenesProductoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ImagenesProductoAgent {
    if (!inst) inst = new ImagenesProductoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultImagenesLlm();
  }

  async run(input: ImagenesInput): Promise<ImagenesOutput> {
    const eliteRole = "Eres **Imagenes Producto** — packshot + fondo IA sin derretir bordes.";
    const mission =
      "Planifica **foto producto** (máscara sujeto, HDRI suave, sombra contacto, consistencia catálogo).";
    const fewShot =
      '{"result":"Pipeline 12 SKU fondo gradiente marca","score":88,"recommendations":["Color check ΔE","Export PNG+WebP","Mantener reflejos reales"]}';
    return runImagenesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getImagenesProductoAgent(): ImagenesProductoAgent {
  return ImagenesProductoAgent.instance();
}

export function resetImagenesProductoAgentForTests(): void {
  inst = null;
}
