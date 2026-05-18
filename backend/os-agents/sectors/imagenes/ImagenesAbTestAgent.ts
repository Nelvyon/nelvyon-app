import type { ILlmClient } from "../../LlmClient";
import type { ImagenesInput, ImagenesOutput } from "./shared";
import { getDefaultImagenesLlm, runImagenesAgentCore } from "./shared";

const AGENT_ID = "imagenes-abtest";

let inst: ImagenesAbTestAgent | null = null;

export class ImagenesAbTestAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ImagenesAbTestAgent {
    if (!inst) inst = new ImagenesAbTestAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultImagenesLlm();
  }

  async run(input: ImagenesInput): Promise<ImagenesOutput> {
    const eliteRole = "Eres **Imagenes A/B Test** — variaciones creativas con hipótesis.";
    const mission =
      "Genera **matriz A/B** (color vs producto vs social proof, naming variantes, métrica primaria CTR).";
    const fewShot =
      '{"result":"4 variantes Flux + hipótesis por celda","score":87,"recommendations":["Congelar logo","Misma composición base","Fatiga 7d"]}';
    return runImagenesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getImagenesAbTestAgent(): ImagenesAbTestAgent {
  return ImagenesAbTestAgent.instance();
}

export function resetImagenesAbTestAgentForTests(): void {
  inst = null;
}
