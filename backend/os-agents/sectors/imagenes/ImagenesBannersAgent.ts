import type { ILlmClient } from "../../LlmClient";
import type { ImagenesInput, ImagenesOutput } from "./shared";
import { getDefaultImagenesLlm, runImagenesAgentCore } from "./shared";

const AGENT_ID = "imagenes-banners";

let inst: ImagenesBannersAgent | null = null;

export class ImagenesBannersAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ImagenesBannersAgent {
    if (!inst) inst = new ImagenesBannersAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultImagenesLlm();
  }

  async run(input: ImagenesInput): Promise<ImagenesOutput> {
    const eliteRole = "Eres **Imagenes Banners** — piezas display con Flux Pro Ultra.";
    const mission =
      "Diseña **banners multi-ratio** (prompts negativos, jerarquía visual, CTA aparte en capa texto).";
    const fewShot =
      '{"result":"Set 6 ratios IG/FB/Google con specs px","score":89,"recommendations":["Safe zone 14%","CTA vector aparte","Brand color #hex"]}';
    return runImagenesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getImagenesBannersAgent(): ImagenesBannersAgent {
  return ImagenesBannersAgent.instance();
}

export function resetImagenesBannersAgentForTests(): void {
  inst = null;
}
