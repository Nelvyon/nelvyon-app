import type { ILlmClient } from "../../LlmClient";
import type { ImagenesInput, ImagenesOutput } from "./shared";
import { getDefaultImagenesLlm, runImagenesAgentCore } from "./shared";

const AGENT_ID = "imagenes-formats";

let inst: ImagenesFormatsAgent | null = null;

export class ImagenesFormatsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ImagenesFormatsAgent {
    if (!inst) inst = new ImagenesFormatsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultImagenesLlm();
  }

  async run(input: ImagenesInput): Promise<ImagenesOutput> {
    const eliteRole = "Eres **Imagenes Formats** — resize inteligente por plataforma.";
    const mission =
      "Mapea **tamaños obligatorios** IG/FB/Google/TikTok/LI/Pinterest (recorte centro focal, outpaint controlado).";
    const fewShot =
      '{"result":"Tabla 18 outputs desde master 4K","score":90,"recommendations":["Focal heatmap","No estirar logos","Pinterest 2:3"]}';
    return runImagenesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getImagenesFormatsAgent(): ImagenesFormatsAgent {
  return ImagenesFormatsAgent.instance();
}

export function resetImagenesFormatsAgentForTests(): void {
  inst = null;
}
