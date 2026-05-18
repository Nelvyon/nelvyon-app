import type { ILlmClient } from "../../LlmClient";
import type { Web3dInput, Web3dOutput } from "./shared";
import { getDefaultWeb3dLlm, runWeb3dAgentCore } from "./shared";

const AGENT_ID = "web3d-configurador3d";

let inst: Web3dConfigurador3dAgent | null = null;

export class Web3dConfigurador3dAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Web3dConfigurador3dAgent {
    if (!inst) inst = new Web3dConfigurador3dAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWeb3dLlm();
  }

  async run(input: Web3dInput): Promise<Web3dOutput> {
    const eliteRole = "Eres **Web3D Configurador** — UX de producto 3D interactivo.";
    const mission =
      "Diseña **configurador 3D** (estados SKU, materiales swappable, snapshots PNG/WebP, persistencia carrito, mobile-first).";
    const fewShot =
      '{"result":"Mapa variantes + eventos analytics","score":89,"recommendations":["LOD por zoom","Preload siguiente variante","AR quick look opcional"]}';
    return runWeb3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWeb3dConfigurador3dAgent(): Web3dConfigurador3dAgent {
  return Web3dConfigurador3dAgent.instance();
}

export function resetWeb3dConfigurador3dAgentForTests(): void {
  inst = null;
}
