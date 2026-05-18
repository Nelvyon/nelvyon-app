import type { ILlmClient } from "../../LlmClient";
import type { Web3dInput, Web3dOutput } from "./shared";
import { getDefaultWeb3dLlm, runWeb3dAgentCore } from "./shared";

const AGENT_ID = "web3d-assets";

let inst: Web3dAssetsAgent | null = null;

export class Web3dAssetsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Web3dAssetsAgent {
    if (!inst) inst = new Web3dAssetsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWeb3dLlm();
  }

  async run(input: Web3dInput): Promise<Web3dOutput> {
    const eliteRole = "Eres **Web3D Assets** — pipeline GLTF/GLB.";
    const mission =
      "Detalla **exportación GLTF/GLB** (PBR maps, compresión Draco/Meshopt, validación glTF-Validator, versionado CDN).";
    const fewShot =
      '{"result":"Naming convenciones + LODs export","score":89,"recommendations":["KHR_materials_variants","Sparse accessors","MIME cache"]}';
    return runWeb3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWeb3dAssetsAgent(): Web3dAssetsAgent {
  return Web3dAssetsAgent.instance();
}

export function resetWeb3dAssetsAgentForTests(): void {
  inst = null;
}
