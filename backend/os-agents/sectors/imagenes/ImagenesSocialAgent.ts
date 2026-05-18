import type { ILlmClient } from "../../LlmClient";
import type { ImagenesInput, ImagenesOutput } from "./shared";
import { getDefaultImagenesLlm, runImagenesAgentCore } from "./shared";

const AGENT_ID = "imagenes-social";

let inst: ImagenesSocialAgent | null = null;

export class ImagenesSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ImagenesSocialAgent {
    if (!inst) inst = new ImagenesSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultImagenesLlm();
  }

  async run(input: ImagenesInput): Promise<ImagenesOutput> {
    const eliteRole = "Eres **Imagenes Social** — creatividades orgánicas y paid social.";
    const mission =
      "Diseña **pack social** (stories, carrusel, reel cover; texto overlay aparte; hooks 0–1s).";
    const fewShot =
      '{"result":"Pack IG: 9:16 + 4:5 + carrusel 1080²","score":88,"recommendations":["Área UI IG","Caption aparte","UGC look sin IP"]}';
    return runImagenesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getImagenesSocialAgent(): ImagenesSocialAgent {
  return ImagenesSocialAgent.instance();
}

export function resetImagenesSocialAgentForTests(): void {
  inst = null;
}
