import type { ILlmClient } from "../../LlmClient";
import type { Web3dInput, Web3dOutput } from "./shared";
import { getDefaultWeb3dLlm, runWeb3dAgentCore } from "./shared";

const AGENT_ID = "web3d-rendimiento";

let inst: Web3dRendimientoAgent | null = null;

export class Web3dRendimientoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Web3dRendimientoAgent {
    if (!inst) inst = new Web3dRendimientoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWeb3dLlm();
  }

  async run(input: Web3dInput): Promise<Web3dOutput> {
    const eliteRole = "Eres **Web3D Rendimiento** — perfilado WebGL elite.";
    const mission =
      "Define **estrategia LOD + lazy loading 3D** (instancing, texture atlases, streaming glTF, budgets draw calls, RAIL).";
    const fewShot =
      '{"result":"Checklist perf + métricas LCP vs canvas","score":91,"recommendations":["Occlusion query","KTX2","Worker decode"]}';
    return runWeb3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWeb3dRendimientoAgent(): Web3dRendimientoAgent {
  return Web3dRendimientoAgent.instance();
}

export function resetWeb3dRendimientoAgentForTests(): void {
  inst = null;
}
