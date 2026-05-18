import type { ILlmClient } from "../../LlmClient";
import type { ImagenesInput, ImagenesOutput } from "./shared";
import { getDefaultImagenesLlm, runImagenesAgentCore } from "./shared";

const AGENT_ID = "imagenes-brandkit";

let inst: ImagenesBrandKitAgent | null = null;

export class ImagenesBrandKitAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ImagenesBrandKitAgent {
    if (!inst) inst = new ImagenesBrandKitAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultImagenesLlm();
  }

  async run(input: ImagenesInput): Promise<ImagenesOutput> {
    const eliteRole = "Eres **Imagenes Brand Kit** — coherencia visual transversal.";
    const mission =
      "Consolida **brand kit visual** (primarios/secundarios, textura, grid fotográfico, prohibidos).";
    const fewShot =
      '{"result":"Kit v1: 5 tokens + 3 moodboards Flux","score":91,"recommendations":["Lock fonts","No mezclar estilos 3D/flat","QA contraste"]}';
    return runImagenesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getImagenesBrandKitAgent(): ImagenesBrandKitAgent {
  return ImagenesBrandKitAgent.instance();
}

export function resetImagenesBrandKitAgentForTests(): void {
  inst = null;
}
