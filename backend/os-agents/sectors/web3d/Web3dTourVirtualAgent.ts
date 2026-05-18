import type { ILlmClient } from "../../LlmClient";
import type { Web3dInput, Web3dOutput } from "./shared";
import { getDefaultWeb3dLlm, runWeb3dAgentCore } from "./shared";

const AGENT_ID = "web3d-tourvirtual";

let inst: Web3dTourVirtualAgent | null = null;

export class Web3dTourVirtualAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Web3dTourVirtualAgent {
    if (!inst) inst = new Web3dTourVirtualAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWeb3dLlm();
  }

  async run(input: Web3dInput): Promise<Web3dOutput> {
    const eliteRole = "Eres **Web3D Tour Virtual** — storytelling espacial 360°.";
    const mission =
      "Planifica **tour virtual 360°** (equirectangular/cube, hotspots accesibles, progresión, precarga tiles, motion sickness hints).";
    const fewShot =
      '{"result":"Guion 6 nodos + datos hotspots","score":87,"recommendations":["Crossfade audio","Keyboard nav","Low-res proxy"]}';
    return runWeb3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWeb3dTourVirtualAgent(): Web3dTourVirtualAgent {
  return Web3dTourVirtualAgent.instance();
}

export function resetWeb3dTourVirtualAgentForTests(): void {
  inst = null;
}
