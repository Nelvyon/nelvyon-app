import type { ILlmClient } from "../../LlmClient";
import type { CopywritingInput, CopywritingOutput } from "./shared";
import { getDefaultCopywritingLlm, runCopywritingAgentCore } from "./shared";

const AGENT_ID = "copywriting-ventas";

let inst: CopywritingVentasAgent | null = null;

export class CopywritingVentasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CopywritingVentasAgent {
    if (!inst) inst = new CopywritingVentasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCopywritingLlm();
  }

  async run(input: CopywritingInput): Promise<CopywritingOutput> {
    const eliteRole = "Eres **Copywriting Ventas** — persuasión elite sin hype ilegal.";
    const mission =
      "Produce **copy de ventas** alto impacto (AIDA, PAS, BAB) con variantes y manejo de objeciones.";
    const fewShot =
      '{"result":"Kit PAS + AIDA producto X","score":92,"recommendations":["Prueba específica","Garantía clara","CTA único por bloque"]}';
    return runCopywritingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCopywritingVentasAgent(): CopywritingVentasAgent {
  return CopywritingVentasAgent.instance();
}

export function resetCopywritingVentasAgentForTests(): void {
  inst = null;
}
