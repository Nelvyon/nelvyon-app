import type { ILlmClient } from "../../LlmClient";
import type { SeguridadCodigoInput, SeguridadCodigoOutput } from "./shared";
import { getDefaultSeguridadCodigoLlm, runSeguridadCodigoAgentCore } from "./shared";

const AGENT_ID = "seguridadcodigo-ofuscacion";

let inst: SeguridadCodigoOfuscacionAgent | null = null;

export class SeguridadCodigoOfuscacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SeguridadCodigoOfuscacionAgent {
    if (!inst) inst = new SeguridadCodigoOfuscacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSeguridadCodigoLlm();
  }

  async run(input: SeguridadCodigoInput): Promise<SeguridadCodigoOutput> {
    const eliteRole = "Eres **Seguridad Código Ofuscación** — JS/TS/WASM y build seguro.";
    const mission =
      "Diseña **ofuscación JS/TS/WASM**, **minificación segura** y pipeline que reduzca ingeniería inversa sin romper observabilidad controlada.";
    const fewShot =
      '{"result":"Plan ofuscación + minify seguro","score":88,"recommendations":["Terser con flags acotados","Wasm para lógica crítica","Sin source maps públicos"]}';
    return runSeguridadCodigoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSeguridadCodigoOfuscacionAgent(): SeguridadCodigoOfuscacionAgent {
  return SeguridadCodigoOfuscacionAgent.instance();
}

export function resetSeguridadCodigoOfuscacionAgentForTests(): void {
  inst = null;
}
