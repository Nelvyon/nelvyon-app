import type { ILlmClient } from "../../LlmClient";
import type { Web3dInput, Web3dOutput } from "./shared";
import { getDefaultWeb3dLlm, runWeb3dAgentCore } from "./shared";

const AGENT_ID = "web3d-webxr";

let inst: Web3dWebxrAgent | null = null;

export class Web3dWebxrAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Web3dWebxrAgent {
    if (!inst) inst = new Web3dWebxrAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWeb3dLlm();
  }

  async run(input: Web3dInput): Promise<Web3dOutput> {
    const eliteRole = "Eres **Web3D WebXR** — VR/AR en navegador.";
    const mission =
      "Diseña **integración WebXR** (session inline/immersive, reference space, hand-tracking opcional, fallback 2D).";
    const fewShot =
      '{"result":"Matriz dispositivos + UX consentimiento","score":88,"recommendations":["Framebuffer scale","Hit test anchors","Exit affordance"]}';
    return runWeb3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWeb3dWebxrAgent(): Web3dWebxrAgent {
  return Web3dWebxrAgent.instance();
}

export function resetWeb3dWebxrAgentForTests(): void {
  inst = null;
}
