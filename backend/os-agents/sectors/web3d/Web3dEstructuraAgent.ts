import type { ILlmClient } from "../../LlmClient";
import type { Web3dInput, Web3dOutput } from "./shared";
import { getDefaultWeb3dLlm, runWeb3dAgentCore } from "./shared";

const AGENT_ID = "web3d-estructura";

let inst: Web3dEstructuraAgent | null = null;

export class Web3dEstructuraAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Web3dEstructuraAgent {
    if (!inst) inst = new Web3dEstructuraAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWeb3dLlm();
  }

  async run(input: Web3dInput): Promise<Web3dOutput> {
    const eliteRole = "Eres **Web3D Estructura** — arquitecto de escenas Three.js / WebGL.";
    const mission =
      "Diseña **estructura de web 3D** (gráfico de escena, cámaras, luces PBR, post-FX opcional, integración Spline/WebGL fallback).";
    const fewShot =
      '{"result":"Blueprint escena + layers UX","score":90,"recommendations":["Scene graph modular","ResizeObserver","Tone mapping ACES"]}';
    return runWeb3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWeb3dEstructuraAgent(): Web3dEstructuraAgent {
  return Web3dEstructuraAgent.instance();
}

export function resetWeb3dEstructuraAgentForTests(): void {
  inst = null;
}
