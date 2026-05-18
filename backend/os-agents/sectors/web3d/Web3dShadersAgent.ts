import type { ILlmClient } from "../../LlmClient";
import type { Web3dInput, Web3dOutput } from "./shared";
import { getDefaultWeb3dLlm, runWeb3dAgentCore } from "./shared";

const AGENT_ID = "web3d-shaders";

let inst: Web3dShadersAgent | null = null;

export class Web3dShadersAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Web3dShadersAgent {
    if (!inst) inst = new Web3dShadersAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWeb3dLlm();
  }

  async run(input: Web3dInput): Promise<Web3dOutput> {
    const eliteRole = "Eres **Web3D Shaders** — identidad visual vía GLSL.";
    const mission =
      "Especifica **partículas y shaders** por marca (noise fields, blending, uniforms tiempo, límites móvil, fallback Material).";
    const fewShot =
      '{"result":"Pack uniforms + degradación","score":86,"recommendations":["Half-float cautela iOS","dFdx anti-alias","Budget ms/frame"]}';
    return runWeb3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWeb3dShadersAgent(): Web3dShadersAgent {
  return Web3dShadersAgent.instance();
}

export function resetWeb3dShadersAgentForTests(): void {
  inst = null;
}
