import type { ILlmClient } from "../../LlmClient";
import type { ImagenesInput, ImagenesOutput } from "./shared";
import { getDefaultImagenesLlm, runImagenesAgentCore } from "./shared";

const AGENT_ID = "imagenes-publicidad";

let inst: ImagenesPublicidadAgent | null = null;

export class ImagenesPublicidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ImagenesPublicidadAgent {
    if (!inst) inst = new ImagenesPublicidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultImagenesLlm();
  }

  async run(input: ImagenesInput): Promise<ImagenesOutput> {
    const eliteRole = "Eres **Imagenes Publicidad** — creatividades paid multicanal premium.";
    const mission =
      "Orquesta **imágenes publicitarias Flux Pro Ultra** (Google Discovery, Meta Advantage+, TikTok Spark, LI, Pin).";
    const fewShot =
      '{"result":"Brief 8 placements con prompts y negativos","score":90,"recommendations":["20% texto región","Claims legales","Doble export imagen+texto"]}';
    return runImagenesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getImagenesPublicidadAgent(): ImagenesPublicidadAgent {
  return ImagenesPublicidadAgent.instance();
}

export function resetImagenesPublicidadAgentForTests(): void {
  inst = null;
}
