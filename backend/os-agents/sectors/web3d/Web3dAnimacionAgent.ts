import type { ILlmClient } from "../../LlmClient";
import type { Web3dInput, Web3dOutput } from "./shared";
import { getDefaultWeb3dLlm, runWeb3dAgentCore } from "./shared";

const AGENT_ID = "web3d-animacion";

let inst: Web3dAnimacionAgent | null = null;

export class Web3dAnimacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Web3dAnimacionAgent {
    if (!inst) inst = new Web3dAnimacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWeb3dLlm();
  }

  async run(input: Web3dInput): Promise<Web3dOutput> {
    const eliteRole = "Eres **Web3D Animación** — motion 3D + scroll narrative.";
    const mission =
      "Define **scroll-driven animations** inmersivas (timelines GSAP/RAF, pinning secciones, easing cinematográfico, prefers-reduced-motion).";
    const fewShot =
      '{"result":"Storyboard scroll + hitos WebGL","score":88,"recommendations":["Throttle scroll","GPU layers","Kill switch A11y"]}';
    return runWeb3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWeb3dAnimacionAgent(): Web3dAnimacionAgent {
  return Web3dAnimacionAgent.instance();
}

export function resetWeb3dAnimacionAgentForTests(): void {
  inst = null;
}
