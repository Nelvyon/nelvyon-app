import type { ILlmClient } from "../../LlmClient";
import type { ImagenesInput, ImagenesOutput } from "./shared";
import { getDefaultImagenesLlm, runImagenesAgentCore } from "./shared";

const AGENT_ID = "imagenes-avatar";

let inst: ImagenesAvatarAgent | null = null;

export class ImagenesAvatarAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ImagenesAvatarAgent {
    if (!inst) inst = new ImagenesAvatarAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultImagenesLlm();
  }

  async run(input: ImagenesInput): Promise<ImagenesOutput> {
    const eliteRole = "Eres **Imagenes Avatar** — personajes de marca reproducibles.";
    const mission =
      "Define **avatar/personaje** (bible visual, poses seed-locked, uso RRSS vs ads, límites deepfake).";
    const fewShot =
      '{"result":"Bible 3 ángulos + paleta piel/ropa marca","score":86,"recommendations":["Consentimiento modelo","No impersonación","Watermark opcional"]}';
    return runImagenesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getImagenesAvatarAgent(): ImagenesAvatarAgent {
  return ImagenesAvatarAgent.instance();
}

export function resetImagenesAvatarAgentForTests(): void {
  inst = null;
}
